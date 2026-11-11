import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'

const STAT_COUNT = 3
const MILES_LEGEND_COUNT = 6

function SkeletonStat() {
  return (
    <div>
      <Skeleton width="50%" />
      <Skeleton width="80%" height={24} />
    </div>
  )
}

// Same rows as a real route card, so the page does not jump when the routes arrive.
export function RouteCardSkeleton() {
  return (
    <Card aria-hidden>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Skeleton width="30%" height={28} />
            <Skeleton variant="rounded" width={110} height={24} />
          </Stack>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 1.5,
            }}
          >
            {Array.from({ length: STAT_COUNT }, (_, index) => (
              <SkeletonStat key={index} />
            ))}
          </Box>
          <Skeleton variant="rounded" height={12} />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 0.5,
            }}
          >
            {Array.from({ length: MILES_LEGEND_COUNT }, (_, index) => (
              <Skeleton key={index} width="70%" />
            ))}
          </Box>
          <Skeleton width="55%" />
        </Stack>
      </CardContent>
    </Card>
  )
}
