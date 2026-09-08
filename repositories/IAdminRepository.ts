import { IAdminCourseRepository } from './IAdminCourseRepository';
import { IAdminUserRepository } from './IAdminUserRepository';
import { ISystemRepository } from './ISystemRepository';

// This interface is now a composite for backward compatibility if needed, 
// or can be removed if all services are updated.
export interface IAdminRepository extends IAdminCourseRepository, IAdminUserRepository, ISystemRepository {}
