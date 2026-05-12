/**
 * Transfer jobs track uploads and downloads of files. The backend
 * exposes detailed progress metrics such as speed and ETA. Null
 * values indicate that information is not yet available for a job.
 */
export interface Transfer {
  id: number;
  file_id: number | null;
  type: string;
  status: string;
  progress: number | null;
  bytes_transferred: number | null;
  total_bytes: number | null;
  started_at: string;
  last_progress_at: string | null;
  current_speed_bps: number | null;
  average_speed_bps: number | null;
  eta_seconds: number | null;
  priority: number | null;
  queue_position: number | null;
  pause_until: string | null;
  created_at: string;
  updated_at: string;
}
