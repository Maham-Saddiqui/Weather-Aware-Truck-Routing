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

export function ShareTrip({ hasTrip }: { hasTrip: boolean }) {
  const { status, canShare, share } = useShareTrip()
  const linkField = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === 'failed') linkField.current?.select()
  }, [status])

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Button
          variant="outlined"
          disabled={!hasTrip}
          startIcon={canShare ? <ShareIcon /> : <ContentCopyIcon />}
          onClick={() => {
            void share()
          }}
        >
          {canShare ? 'Share trip' : 'Copy link'}
        </Button>
        <Typography variant="caption" role="status" color="text.secondary">
          {MESSAGES[status]}
        </Typography>
      </Stack>
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
