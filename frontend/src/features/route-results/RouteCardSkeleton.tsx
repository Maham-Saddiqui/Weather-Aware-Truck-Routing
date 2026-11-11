import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'

export function RouteCardSkeleton() {
  return (
    <Card aria-hidden>
      <CardContent>
        <Stack spacing={1.5}>
          <Skeleton width="40%" height={28} />
          <Skeleton width="80%" />
          <Skeleton variant="rounded" height={12} />
          <Skeleton width="60%" />
        </Stack>
      </CardContent>
    </Card>
  )
}
