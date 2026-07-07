'use client'

import { useState, useEffect } from 'react'
import { SignIn, useUser } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Shield, Scan, CalendarDays, BarChart3, Sparkles } from 'lucide-react'
import styles from './page.module.css'

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

const floatingVariants = {
  animate: {
    y: [0, -18, 0],
    transition: { duration: 5, ease: 'easeInOut', repeat: Infinity },
  },
}

const logoVariants = {
  hidden: { scale: 0.75, opacity: 0, rotate: -8 },
  visible: {
    scale: 1,
    opacity: 1,
    rotate: 0,
    transition: { duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function SignInPage() {
  const [isLoaded, setIsLoaded] = useState(false)
  const { user, isLoaded: userLoaded } = useUser()
  const router = useRouter()

  /* Redirect logic ---------------------------------------------------- */
  const getRedirectUrl = () => {
    if (!userLoaded || !user) return '/dashboard'
    const role = (user.publicMetadata?.role as string) ?? ''
    if (role === 'tech_support') return '/tech-support/dashboard'
    return '/dashboard'
  }

  useEffect(() => {
    if (userLoaded && user) {
      router.push(getRedirectUrl())
    }
    setIsLoaded(true)
  }, [userLoaded, user, router])

  /* ------------------------------------------------------------------ */
  return (
    <div className={styles.page}>
      {/* ============================================================= */
      /*  LEFT PANEL — Brand Showcase                                   */
      /* ============================================================= */}
      <motion.aside
        className={styles.brandPanel}
        initial={{ opacity: 0, x: -60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Gradient + noise texture overlay ----------------------------*/}
        <div className={styles.brandPanelGradient} />
        <div className={styles.noiseOverlay} />

        {/* Floating crystal particles ----------------------------------*/}
        <div className={styles.floatingOrbs}>
          <motion.div
            className={`${styles.orb} ${styles.orb1}`}
            variants={floatingVariants}
            animate="animate"
          />
          <motion.div
            className={`${styles.orb} ${styles.orb2}`}
            variants={floatingVariants}
            animate="animate"
            style={{ animationDelay: '2s' }}
          />
          <motion.div
            className={`${styles.orb} ${styles.orb3}`}
            variants={floatingVariants}
            animate="animate"
            style={{ animationDelay: '4s' }}
          />
          <motion.div
            className={`${styles.orb} ${styles.orb4}`}
            variants={floatingVariants}
            animate="animate"
            style={{ animationDelay: '1.5s' }}
          />
        </div>

        {/* Content -----------------------------------------------------*/}
        <div className={styles.brandContent}>
          {/* Logo */}
          <motion.div
            variants={logoVariants}
            initial="hidden"
            animate="visible"
            className={styles.logoContainer}
          >
            <Image
              src="/Logo.svg"
              alt="Diamond Link Dental"
              width={128}
              height={128}
              className={styles.logo}
              priority
            />
            <div className={styles.logoGlow} />
          </motion.div>

          {/* Tagline badge */}
          <motion.div
            className={styles.badge}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Sparkles className={styles.badgeIcon} />
            <span>Clínica Dental Premium</span>
          </motion.div>

          {/* Headlines */}
          <motion.h1
            className={styles.headline}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.7 }}
          >
            Diamond Link
          </motion.h1>

          <motion.p
            className={styles.subHeadline}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.7 }}
          >
            Sonríe con confianza, vive con excelencia.
          </motion.p>

          <motion.p
            className={styles.description}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.7 }}
          >
            Sistema integral de gestión clínica diseñado para ofrecer
            atención dental de clase mundial con tecnología de vanguardia.
          </motion.p>

          {/* Trust indicators */}
          <motion.div
            className={styles.trustIndicators}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {[
              { Icon: Shield, label: 'HIPAA Compliant' },
              { Icon: Scan, label: 'Datos Encriptados' },
              { Icon: CalendarDays, label: 'Citas en Línea' },
              { Icon: BarChart3, label: 'Analíticas Avanzadas' },
            ].map(({ Icon, label }) => (
              <motion.div
                key={label}
                variants={itemVariants}
                className={styles.trustBadge}
              >
                <Icon className={styles.trustIcon} strokeWidth={1.8} />
                <span className={styles.trustLabel}>{label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom quote */}
          <motion.blockquote
            className={styles.quote}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.8 }}
          >
            &ldquo;La excelencia no es un acto, es un h&aacute;bito.&rdquo;
            <cite className={styles.quoteCite}>— Dr. Diamond</cite>
          </motion.blockquote>

          <motion.p
            className={styles.copyright}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 0.6 }}
          >
            &copy; {new Date().getFullYear()} Diamond Link Dental Clinic. Todos los derechos reservados.
          </motion.p>
        </div>
      </motion.aside>

      {/* ============================================================= */
      /*  RIGHT PANEL — Sign-In Form                                    */
      /* ============================================================= */}
      <motion.main
        className={styles.formPanel}
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      >
        {/* Mobile-only brand header */}
        <motion.div
          className={styles.mobileBrand}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Image
            src="/Logo.svg"
            alt="Diamond Link Dental"
            width={72}
            height={72}
            className={styles.mobileLogo}
            priority
          />
          <h2 className={styles.mobileTitle}>Diamond Link</h2>
          <p className={styles.mobileTagline}>Excellence in Dental Care</p>
        </motion.div>

        {/* Sign-in Card */}
        <AnimatePresence mode="wait">
          {isLoaded && userLoaded && !user && (
            <motion.div
              key="signin-card"
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.4, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={styles.card}
            >
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Bienvenido de vuelta</h3>
                <p className={styles.cardSubtitle}>
                  Inicie sesión para acceder a su panel de administración
                </p>
              </div>

              <SignIn
                appearance={{
                  elements: {
                    rootBox: styles.clRoot,
                    card: styles.clCard,
                    headerTitle: 'sr-only',
                    headerSubtitle: 'sr-only',
                    socialButtonsBlockButton: styles.clSocialBtn,
                    formFieldLabel: styles.clLabel,
                    formFieldInput: styles.clInput,
                    formButtonPrimary: styles.clPrimaryBtn,
                    formButtonSecondary: styles.clSecondaryBtn,
                    footerActionLink: styles.clLink,
                    identityPreviewEditButton: styles.clLink,
                    formFieldAction: styles.clLink,
                    otpCodeFieldInput: styles.clOtp,
                    dividerLine: styles.clDivider,
                    dividerText: styles.clDividerText,
                    form: styles.clForm,
                    footer: styles.clFooter,
                    alertText: 'text-gray-700 dark:text-gray-300',
                    alertError: 'text-red-500',
                    alertWarning: 'text-amber-500',
                  },
                  layout: {
                    socialButtonsPlacement: 'top',
                    showOptionalFields: true,
                  },
                }}
                routing="path"
                path="/sign-in"
                fallbackRedirectUrl={getRedirectUrl()}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer links */}
        <motion.nav
          className={styles.formFooter}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          {[
            { label: 'Política de Privacidad', href: '#' },
            { label: 'Términos de Servicio', href: '#' },
            { label: 'Soporte', href: '#' },
          ].map((link) => (
            <a key={link.label} href={link.href} className={styles.footerLink}>
              {link.label}
            </a>
          ))}
        </motion.nav>

        {/* Mobile-only copyright */}
        <motion.p
          className={styles.mobileCopyright}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          &copy; {new Date().getFullYear()} Diamond Link Dental
        </motion.p>
      </motion.main>
    </div>
  )
}
