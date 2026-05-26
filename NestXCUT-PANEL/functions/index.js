const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const LOCAL_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

function getAllowedOrigins() {
  const configured = process.env.ALLOWED_ORIGINS || process.env.CORS_ALLOWED_ORIGINS || '';
  const configuredOrigins = configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([...LOCAL_ALLOWED_ORIGINS, ...configuredOrigins]);
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  if (origin && allowedOrigins.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }

  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
}

/**
 * Elimina usuario completamente: Firestore + Authentication
 * Llamar desde el Panel con: https.usableCallable
 */
exports.deleteUserCompletely = functions.https.onRequest(async (req, res) => {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Debe estar autenticado' });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    const callerUid = decoded.uid;
    const callerDoc = await admin.firestore().doc(`users/${callerUid}`).get();
    const callerData = callerDoc.data();

    if (callerData?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo admins pueden eliminar usuarios' });
    }

    const { userId, email } = req.body || {};
    if (!userId && !email) {
      return res.status(400).json({ success: false, message: 'Se requiere userId o email' });
    }

    let targetUid = userId;
    if (!targetUid && email) {
      try {
        const userRecord = await admin.auth().getUserByEmail(email);
        targetUid = userRecord.uid;
      } catch (e) {
        if (e.code !== 'auth/user-not-found') throw e;
      }
    }

    if (!targetUid) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (targetUid) {
      try {
        await admin.auth().deleteUser(targetUid);
        console.log(`Usuario ${targetUid} eliminado de Auth`);
      } catch (e) {
        if (e.code !== 'auth/user-not-found') throw e;
        console.log(`Usuario ${targetUid} no encontrado en Auth (puede ya estar eliminado)`);
      }
    }

    await admin.firestore().doc(`users/${targetUid}`).delete();
    console.log(`Documento users/${targetUid} eliminado`);

    const licensesSnap = await admin.firestore()
      .collection('licenses')
      .where('userId', '==', targetUid)
      .get();

    const deletePromises = [];
    licensesSnap.forEach((licenseDoc) => {
      deletePromises.push(licenseDoc.ref.delete());
    });

    const [devicesByCurrentUser, devicesByLastUser] = await Promise.all([
      admin.firestore().collection('devices').where('currentUserUid', '==', targetUid).get(),
      admin.firestore().collection('devices').where('lastUserUid', '==', targetUid).get(),
    ]);

    const deviceRefsToDelete = new Map();
    devicesByCurrentUser.forEach((doc) => deviceRefsToDelete.set(doc.ref.path, doc.ref));
    devicesByLastUser.forEach((doc) => deviceRefsToDelete.set(doc.ref.path, doc.ref));
    deviceRefsToDelete.forEach((docRef) => {
      deletePromises.push(docRef.delete());
    });

    await Promise.all(deletePromises);
    console.log(`${licensesSnap.size} licencias eliminadas`);
    console.log(`${deviceRefsToDelete.size} devices eliminados`);

    return res.status(200).json({ success: true, message: 'Usuario eliminado completamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return res.status(500).json({ success: false, message: error.message || 'internal' });
  }
});
