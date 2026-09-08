import React from 'react';
import AdminContentManagement from './AdminContentManagement';
import LessonAvailabilityPanel from './LessonAvailabilityPanel';
import { AdminService } from '../services/AdminService';
import { LessonRecord } from '../domain/admin';

type Props = {
  adminService: AdminService;
  initialCourseId?: string;
  initialModuleId?: string;
  initialLessonId?: string;
  onOpenContentEditor?: (lesson: LessonRecord) => void;
  user: { id: string; role: string; email: string };
};

const AdminContentManagementWithAvailability: React.FC<Props> = (props) => {
  return (
    <>
      <LessonAvailabilityPanel adminService={props.adminService} user={props.user} />
      <AdminContentManagement {...props} />
    </>
  );
};

export default AdminContentManagementWithAvailability;
