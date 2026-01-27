# Diamond Link - Sistema de Tutoriales

## 🎯 Overview
Sistema de bienvenida guiada para nuevos usuarios, adaptado por rol (Admin, Doctor, Staff).

## 🏗️ Componentes
- **TutorialContext**: Estado global y control del tutorial
- **TutorialModal**: Interfaz visual con navegación
- **TutorialButton**: Botón para reiniciar tutorial

## 👥 Contenidos por Rol

### 🏛️ Administrador
- Bienvenida y control total del sistema
- Panel de administración y herramientas
- Gestión de usuarios y permisos
- Reportes y configuración

### 👨‍⚕️ Doctor  
- Herramientas médicas principales
- Gestión de pacientes e historiales
- Calendario personal y citas
- Odontograma y tratamientos

### 👥 Staff
- Rol de apoyo y funciones básicas
- Registro de pacientes
- Gestión de citas diarias
- Soporte administrativo

## ✨ Características
- **Auto-inicio**: Primer login detecta rol automáticamente
- **Progreso persistente**: Guarda estado en localStorage
- **Resaltado UI**: Elementos se destacan durante tutorial
- **Navegación flexible**: Anterior/Siguiente/Omitir
- **Indicadores visuales**: Barra de progreso y contador

## 🔧 Uso
El tutorial inicia automáticamente en primer login. Para reiniciar:
- Header: Botón "Tutorial" 
- Sidebar: "Ver Tutorial" en menú de usuario

## 📍 Integración
Añadido en `layout.tsx` con TutorialProvider y TutorialModal. Disponible en todos los sidebars.
