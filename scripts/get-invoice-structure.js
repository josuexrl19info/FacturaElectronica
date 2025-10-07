const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function getInvoiceStructure() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('🔍 Consultando factura con ID: 76yALPRjfgTA7bqzcD50');
    
    const docRef = doc(db, 'invoices', '76yALPRjfgTA7bqzcD50');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('✅ Factura encontrada:');
      console.log('📋 Estructura completa:');
      console.log(JSON.stringify(data, null, 2));
      
      console.log('\n🔍 Análisis de campos:');
      Object.keys(data).forEach(key => {
        const value = data[key];
        console.log(`- ${key}: ${typeof value} ${Array.isArray(value) ? `(array[${value.length}])` : ''}`);
        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          console.log(`  Subcampos: ${Object.keys(value).join(', ')}`);
        }
      });
      
      if (data.items && Array.isArray(data.items)) {
        console.log('\n📦 Estructura de items:');
        data.items.forEach((item, index) => {
          console.log(`Item ${index + 1}:`);
          Object.keys(item).forEach(key => {
            console.log(`  - ${key}: ${typeof item[key]} ${Array.isArray(item[key]) ? `(array[${item[key].length}])` : ''}`);
          });
        });
      }
      
    } else {
      console.log('❌ No se encontró la factura con ese ID');
    }
    
  } catch (error) {
    console.error('❌ Error al consultar factura:', error);
  }
}

getInvoiceStructure();
