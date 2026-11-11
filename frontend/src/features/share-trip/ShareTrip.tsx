import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ShareIcon from '@mui/icons-material/IosShare'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useRef } from 'react'
import { useShareTrip, type ShareStatus } from './useShareTrip'

const MESSAGES: Record<ShareStatus, string> = {
  idle: '',
  copied: 'Link copied',
  failed: 'The link could not be copied. Select it below and copy it yourself.',
}

interface ShareButtonsProps {
  canShare: boolean
  status: ShareStatus
  onShare: () => void
  onCopy: () => void
}

// Both actions are always visible together: the share sheet where the device has one, and a plain copy everywhere.
function ShareButtons({ canShare, status, onShare, onCopy }: ShareButtonsProps) {
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      {canShare && (
        <Button variant="outlined" size="small" startIcon={<ShareIcon />} onClick={onShare}>
          Share trip
        </Button>
      )}
      <Button variant="outlined" size="small" startIcon={<ContentCopyIcon />} onClick={onCopy}>
        Copy link
      </Button>
      <Typography variant="caption" role="status" color="text.secondary">
        {MESSAGES[status]}
      </Typography>
    </Stack>
  )
}

export function ShareTrip() {
  const { status, canShare, share, copy } = useShareTrip()
  const linkField = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === 'failed') linkField.current?.select()
  }, [status])

  return (
    <Stack spacing={1}>
      <ShareButtons
        canShare={canShare}
        status={status}
        onShare={() => {
          void share()
        }}
        onCopy={() => {
          void copy()
        }}
      />
      {status === 'failed' && (
        <TextField
          label="Trip link"
          size="small"
          value={window.location.href}
          inputRef={linkField}
          slotProps={{ htmlInput: { readOnly: true } }}
          onFocus={(event) => {
            event.target.select()
          }}
        />
      )}
    </Stack>
  )
}
