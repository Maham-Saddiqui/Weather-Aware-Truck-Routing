import { styled } from '@mui/material/styles'
import { useState, type ReactNode } from 'react'
import { useHealth } from '../shared/api/useHealth'
import { Header } from './Header'
import type { OpenDialog } from './LazyDialogs'
import { LazyDialogs } from './LazyDialogs'
import { useRoutingCopyright } from './useAttribution'

const Root = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100dvh',
  [theme.breakpoints.up('md')]: { height: '100dvh' },
}))

export function AppShell({ children }: { children: ReactNode }) {
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)
  useHealth()
  useRoutingCopyright()
  const close = () => {
    setOpenDialog(null)
  }

  return (
    <Root>
      <Header
        onOpenRiskInfo={() => {
          setOpenDialog('risk')
        }}
        onOpenCredits={() => {
          setOpenDialog('credits')
        }}
      />
      {children}
      <LazyDialogs openDialog={openDialog} onClose={close} />
    </Root>
  )
}
