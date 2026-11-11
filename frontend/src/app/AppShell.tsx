import { styled } from '@mui/material/styles'
import { useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { api } from '../shared/api/client'
import { CreditsDialog } from './CreditsDialog'
import { Header } from './Header'
import { RiskInfoDialog } from './RiskInfoDialog'

const Root = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100dvh',
  [theme.breakpoints.up('md')]: { height: '100dvh' },
}))

type OpenDialog = 'credits' | 'risk' | null

export function AppShell({ children }: { children: ReactNode }) {
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)
  useQuery({ queryKey: ['health'], queryFn: api.getHealth })
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
      <CreditsDialog open={openDialog === 'credits'} onClose={close} />
      <RiskInfoDialog open={openDialog === 'risk'} onClose={close} />
    </Root>
  )
}
