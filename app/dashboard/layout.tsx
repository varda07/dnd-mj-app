import DiceLauncher from '@/app/components/DiceLauncher'
import SoundBox from '@/app/components/SoundBox'
import CommandPalette from '@/app/components/CommandPalette'
import Sidebar from '@/app/components/Sidebar'
import OnboardingTutorial from '@/app/components/OnboardingTutorial'
import NotificationCenter from '@/app/components/NotificationCenter'
import HomeButton from '@/app/components/HomeButton'
import ThemeLoader from './ThemeLoader'
import SessionGuard from '@/app/components/SessionGuard'
import AdminAlert from '@/app/components/AdminAlert'
import PageTransition from '@/app/components/ui/PageTransition'
import ToastHost from '@/app/components/ui/Toast'
import ConfirmDialogHost from '@/app/components/ui/ConfirmDialog'
import BackToTop from '@/app/components/ui/BackToTop'
import RandomTip from '@/app/components/RandomTip'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <ThemeLoader />
      <SessionGuard />
      <AdminAlert />
      <Sidebar />
      <HomeButton />
      {/* Roadmap 1.7 — sidebar à droite : on padd à droite plutôt qu'à gauche.
          pt-14 (mobile) / pt-12 (desktop) pour laisser passer la barre d'icônes
          top-left (🏠 + 🔔, ~52px de haut + marges) sans recouvrir le contenu
          (back button, titre…) des pages enfant. */}
      <div className="md:pr-[var(--sidebar-w,200px)] pt-14 md:pt-14 min-h-screen transition-[padding] duration-200 ease-out">
        <PageTransition>{children}</PageTransition>
      </div>
      <SoundBox />
      <DiceLauncher />
      <CommandPalette />
      <NotificationCenter />
      <OnboardingTutorial />
      <ToastHost />
      <ConfirmDialogHost />
      <BackToTop />
      <RandomTip />
    </>
  )
}
