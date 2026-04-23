import DiceLauncher from '@/app/components/DiceLauncher'
import SoundBox from '@/app/components/SoundBox'
import GlobalSearch from '@/app/components/GlobalSearch'
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
      <SoundBox />
      <DiceLauncher />
      <GlobalSearch />
    </>
  )
}
