/**
 * Admin Domain Entities
 * Entidades específicas para funcionalidades administrativas
 */

export interface UserApprovalData {
    userId: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string | null;
    approvedAt?: Date | null;
    rejectionReason?: string | null;
}

export class UserApproval {
    constructor(
        public readonly userId: string,
        public readonly status: 'pending' | 'approved' | 'rejected',
        public readonly approvedBy: string | null = null,
        public readonly approvedAt: Date | null = null,
        public readonly rejectionReason: string | null = null
    ) { }

    public isPending(): boolean {
        return this.status === 'pending';
    }

    public isApproved(): boolean {
        return this.status === 'approved';
    }

    public isRejected(): boolean {
        return this.status === 'rejected';
    }
}

export interface CourseAssignmentData {
    userId: string;
    courseId: string;
    assignedBy: string;
    assignedAt?: Date;
}

export class CourseAssignment {
    constructor(
        public readonly userId: string,
        public readonly courseId: string,
        public readonly assignedBy: string,
        public readonly assignedAt: Date = new Date()
    ) { }
}
