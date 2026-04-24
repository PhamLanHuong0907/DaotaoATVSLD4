import dayjs from 'dayjs';
import type { ExamRoomResponse } from '@/api/examRoomApi';
import { examRoomStatusLabels } from './vietnameseLabels';

export type StatusColor = 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary';

export function getDynamicRoomStatus(room: ExamRoomResponse): { label: string; color: StatusColor } {
  // 1. Hard overrides từ trường status chung
  if (room.status === 'cancelled') {
    return { label: examRoomStatusLabels['cancelled'] || 'Đã huỷ', color: 'error' };
  }

  if (room.approval_status === 'rejected') {
    return { label: 'Đã huỷ', color: 'error' };
  }

  // 2. Nếu trạng thái duyệt là pending_review HOẶC backend chưa trả về (falsy)
  if (!room.approval_status || room.approval_status === 'pending_review') {
    return { label: 'Chờ duyệt', color: 'warning' };
  }

  // 3. Time-based phases - CHỈ ÁP DỤNG KHI ĐÃ ĐƯỢC DUYỆT
  if (room.approval_status === 'approved') {
    const now = dayjs();
    const start = dayjs(room.scheduled_start);
    const end = dayjs(room.scheduled_end);

    if (now.isBefore(start)) {
      return { label: 'Đã lên lịch', color: 'info' };
    }
    if (now.isAfter(end)) {
      return { label: 'Đã kết thúc', color: 'default' }; // Kết thúc thường dùng màu xám (default)
    }

    return { label: 'Đang diễn ra', color: 'success' }; // Đang diễn ra nên để màu xanh lá (success) nổi bật
  }

  // Fallback cuối cùng nếu có trạng thái lạ
  return { label: 'Chưa xác định', color: 'default' };
}