import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import { useQuery } from '@tanstack/react-query'
import { api } from '../shared/api/client'

interface CreditsDialogProps {
  open: boolean
  onClose: () => void
}

function useRoutingCopyright(): string {
  const attribution = useQuery({ queryKey: ['attribution'], queryFn: api.getAttribution })
  if (attribution.data) return attribution.data.routing_copyright
  return attribution.isError ? 'Routing copyright text is unavailable right now.' : 'Loading…'
}

export function CreditsDialog({ open, onClose }: CreditsDialogProps) {
  const routingCopyright = useRoutingCopyright()
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="credits-title">
      <DialogTitle id="credits-title">Credits</DialogTitle>
      <DialogContent>
        <List dense disablePadding>
          <ListItem disableGutters>
            <ListItemText primary="Routing" secondary={routingCopyright} />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="Map data"
              secondary="© OpenStreetMap contributors, © OpenMapTiles"
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText primary="Address search" secondary="Photon, using OpenStreetMap data" />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="Weather"
              secondary={
                <Link href="https://open-meteo.com/" target="_blank" rel="noreferrer">
                  Weather data by Open-Meteo.com
                </Link>
              }
            />
          </ListItem>
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
