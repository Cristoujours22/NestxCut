const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Configurar región y CORS para todas las funciones
const runtimeOpts = {
  region: 'us-central1',
  cors: true
};

/**
 * Elimina usuario completamente: Firestore + Authentication
 * Llamar desde el Panel con: https.usableCallable
 */
exports.deleteUserCompletely = functions.runWith(runtimeOpts).https.onCall(async (data, context) => {
  // Verificar que es admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debe estar autenticado');
  }
  
  const callerUid = context.auth.uid;
  const callerDoc = await admin.firestore().doc(`users/${callerUid}`).get();
  const callerData = callerDoc.data();
  
  if (callerData?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Solo admins pueden eliminar usuarios');
  }

  const { userId, email } = data;
  
  if (!userId && !email) {
    throw new functions.https.HttpsError('invalid-argument', 'Se requiere userId o email');
  }

  try {
    // 1. Eliminar de Authentication (por UID)
    if (userId) {
      try {
        await admin.auth().deleteUser(userId);
        console.log(`Usuario ${userId} eliminado de Auth`);
      } catch (e) {
        if (e.code !== 'auth/user-not-found') {
          throw e;
        }
        console.log(`Usuario ${userId} no encontrado en Auth (puede ya estar eliminado)`);
      }
    }

    // 2. Eliminar de Firestore - users
    if (userId) {
      await admin.firestore().doc(`users/${userId}`).delete();
      console.log(`Documento users/${userId} eliminado`);
    }

    // 3. Eliminar licencias asociadas (buscar por userId campo)
    const licensesSnap = await admin.firestore()
      .collection('licenses')
      .where('userId', '==', userId)
      .get();
    
    const deletePromises = [];
    licensesSnap.forEach(doc => {
      deletePromises.push(doc.ref.delete());
    });
    await Promise.all(deletePromises);
    console.log(`${licensesSnap.size} licencias eliminadas`);

    return { success: true, message: 'Usuario eliminado completamente' };
    
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});