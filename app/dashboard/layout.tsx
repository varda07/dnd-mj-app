import DiceLauncher from '@/app/components/DiceLauncher'
import SoundBox from '@/app/components/SoundBox'
import CommandPalette from '@/app/components/CommandPalette'
import Sidebar from '@/app/components/Sidebar'
import OnboardingTutorial from '@/app/components/OnboardingTutorial'
import NotificationCenter from '@/app/components/NotificationCenter'
import ThemeLoader from './ThemeLoader'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <ThemeLoader />
      <Sidebar />
      <div className="md:pl-[var(--sidebar-w,200px)] min-h-screen transition-[padding] duration-200 ease-out">
        {children}
      </div>
      <SoundBox />
      <DiceLauncher />
      <CommandPalette />
      <NotificationCenter />
      <OnboardingTutorial />
    </>
  )
}
