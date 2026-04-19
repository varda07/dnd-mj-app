import DiceLauncher from '@/app/components/DiceLauncher'
import ThemeLoader from './ThemeLoader'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <ThemeLoader />
      {children}
      <DiceLauncher />
    </>
  )
}
