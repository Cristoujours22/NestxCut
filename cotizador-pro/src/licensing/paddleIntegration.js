let paddleReadyPromise = null;

async function getPaddleConfig() {
  const fallback = {
    PADDLE_ENV: 'sandbox',
    PADDLE_VENDOR_ID: '54972',
    PADDLE_PRICE_ID: 'pri_01kn8jhf5wjg2pjfdfbfw522pp',
    PADDLE_CLIENT_TOKEN: 'test_a1214e7982f9490b485c72877e0'
  };

  try {
    if (window.electronAPI?.getPaddleConfig) {
      const cfg = await window.electronAPI.getPaddleConfig();
      return { ...fallback, ...(cfg || {}) };
    }
  } catch (error) {
    console.warn('[Paddle] Error leyendo config, usando fallback:', error);
  }

  return fallback;
}

function loadPaddleScript() {
  return new Promise((resolve, reject) => {
    if (window.Paddle) {
      resolve(window.Paddle);
      return;
    }

    if (!document?.head) {
      reject(new Error('DOM no listo para cargar Paddle.js'));
      return;
    }

    const existing = document.querySelector('script[data-paddle-v2="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Paddle), { once: true });
      existing.addEventListener('error', () => reject(new Error('Error cargando Paddle.js')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.dataset.paddleV2 = 'true';
    script.onload = () => resolve(window.Paddle);
    script.onerror = () => reject(new Error('Error de red al cargar Paddle.js v2'));
    document.head.appendChild(script);
  });
}

export async function initializePaddleFromEnv(onCheckoutComplete) {
  if (paddleReadyPromise) return paddleReadyPromise;

  paddleReadyPromise = (async () => {
    const cfg = await getPaddleConfig();
    const token = cfg.PADDLE_CLIENT_TOKEN;
    const env = cfg.PADDLE_ENV || 'sandbox';

    if (!token) {
      throw new Error('PADDLE_CLIENT_TOKEN no configurado');
    }

    const Paddle = await loadPaddleScript();

    if (!Paddle) {
      throw new Error('Paddle.js no disponible tras la carga');
    }

    if (typeof Paddle.Environment?.set === 'function') {
      Paddle.Environment.set(env);
    }

    if (typeof Paddle.Initialize !== 'function') {
      throw new Error('Paddle.Initialize no está disponible. Verificá que cargó paddle/v2.');
    }

    Paddle.Initialize({
      token,
      eventCallback: async (data) => {
        console.log('[Paddle event]', data.name, data);
        
        // Detectar checkout completado
        if (data.name === 'checkout.completed' && onCheckoutComplete) {
          try {
            const paymentData = {
              subscriptionId: data.data?.subscription?.id || data.data?.id,
              customerId: data.data?.customer?.id,
              priceId: data.data?.items?.[0]?.price?.id || data.data?.items?.[0]?.price_id || cfg.PADDLE_PRICE_ID,
              userId: data.data?.custom_data?.userId,
              transactionId: data.data?.transaction?.id,
              status: data.data?.status,
              raw: data.data
            };

            console.log('[Paddle] Payment completed, activating license...', paymentData);

            if (window.electronAPI?.activateLicenseAfterPayment) {
              const result = await window.electronAPI.activateLicenseAfterPayment(paymentData);
              console.log('[Paddle] License activated:', result);
              onCheckoutComplete(result);
            } else {
              console.warn('[Paddle] electronAPI.activateLicenseAfterPayment not available');
              onCheckoutComplete({ success: true, manual: true, data: paymentData });
            }
          } catch (error) {
            console.error('[Paddle] Error activating license:', error);
          }
        }
      }
    });

    return Paddle;
  })().catch((error) => {
    paddleReadyPromise = null;
    throw error;
  });

  return paddleReadyPromise;
}

export async function openCheckoutFromEnv(plan, userEmail, userId, onCheckoutComplete) {
  const cfg = await getPaddleConfig();
  const priceId = plan?.paddle_price_id || plan?.price_id || cfg.PADDLE_PRICE_ID;

  if (!priceId) {
    console.error('[Paddle] Price ID faltante. Config:', cfg, 'Plan:', plan);
    throw new Error('Price ID no configurado. Verifica PADDLE_PRICE_ID en variables de entorno o en el plan.');
  }

  const Paddle = await initializePaddleFromEnv(onCheckoutComplete);

  if (typeof Paddle.Checkout?.open !== 'function') {
    throw new Error('Paddle.Checkout.open no está disponible');
  }

  console.log('[Paddle] Abriendo overlay checkout con priceId:', priceId);

  Paddle.Checkout.open({
    items: [
      {
        priceId,
        quantity: 1
      }
    ],
    customer: userEmail ? { email: userEmail } : undefined,
    customData: {
      userId: userId || null
    },
    settings: {
      displayMode: 'overlay',
      theme: 'dark',
      locale: 'es'
    }
  });
}

export default { initializePaddleFromEnv, openCheckoutFromEnv };
