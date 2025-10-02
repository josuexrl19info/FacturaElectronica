#!/bin/bash

echo "🔥 Configuración de Firebase para InvoSell"
echo "=========================================="

# Crear archivo .env.local si no existe
if [ ! -f .env.local ]; then
    echo "📝 Creando archivo .env.local..."
    cp firebase-config-template.env .env.local
    echo "✅ Archivo .env.local creado"
    echo "⚠️  IMPORTANTE: Edita .env.local con tus credenciales de Firebase"
else
    echo "✅ Archivo .env.local ya existe"
fi

echo ""
echo "📋 Próximos pasos:"
echo "1. Obtén las credenciales de tu proyecto Firebase actual"
echo "2. Edita el archivo .env.local con tus credenciales"
echo "3. Ejecuta: npm run dev para probar localmente"
echo "4. Ejecuta: firebase deploy para desplegar"
echo ""
echo "🔗 Consola Firebase: https://console.firebase.google.com"
