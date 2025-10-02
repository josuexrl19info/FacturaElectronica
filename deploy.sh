#!/bin/bash

echo "🚀 Despliegue de InvoSell a Firebase Hosting"
echo "==========================================="

# Verificar que Firebase CLI esté instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI no está instalado"
    echo "📦 Instalando Firebase CLI..."
    npm install -g firebase-tools
fi

# Verificar login
echo "🔐 Verificando autenticación..."
if ! firebase projects:list &> /dev/null; then
    echo "⚠️  Necesitas autenticarte en Firebase"
    echo "🔗 Ejecuta: firebase login"
    exit 1
fi

# Verificar archivo .env.local
if [ ! -f .env.local ]; then
    echo "❌ Archivo .env.local no encontrado"
    echo "📝 Ejecuta: ./setup-firebase.sh"
    exit 1
fi

echo "✅ Autenticación verificada"

# Seleccionar proyecto
echo ""
echo "📋 Proyectos disponibles:"
firebase projects:list

echo ""
echo "🎯 Selecciona tu proyecto:"
read -p "Ingresa el Project ID: " project_id

if [ -z "$project_id" ]; then
    echo "❌ Project ID requerido"
    exit 1
fi

# Configurar proyecto
echo "⚙️  Configurando proyecto: $project_id"
firebase use $project_id

# Construir aplicación
echo "🔨 Construyendo aplicación..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error en la construcción"
    exit 1
fi

echo "✅ Construcción completada"

# Desplegar
echo "🚀 Desplegando a Firebase Hosting..."
firebase deploy --only hosting

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 ¡Despliegue exitoso!"
    echo "🌐 Tu aplicación InvoSell está ahora en:"
    echo "   https://$project_id.web.app"
    echo "   https://$project_id.firebaseapp.com"
    echo ""
    echo "📊 Para ver el estado: firebase hosting:channel:list"
    echo "🔄 Para rollback: firebase hosting:releases:list"
else
    echo "❌ Error en el despliegue"
    exit 1
fi
