import { styled } from '@mui/material/styles'
import { useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { api } from '../shared/api/client'
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
  useQuery({ queryKey: ['health'], queryFn: api.getHealth })
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
