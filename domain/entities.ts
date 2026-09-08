import { ValidationError } from './errors';

export interface ILessonData {
  id: string;
  title: string;
  videoUrl: string;
  videoUrls?: { url: string; title: string; imageUrl?: string; type?: 'video' | 'slides'; slides?: string[]; fileUrl?: string; fileType?: 'pdf' | 'pptx' }[];
  content?: string;
  audioUrl?: string;
  imageUrl?: string;
  resources?: LessonResource[];
  durationSeconds: number;
  watchedSeconds: number;
  isCompleted: boolean;
  position: number;
  lastAccessedBlockId?: string | null;
  contentBlocks?: IContentBlock[];
  hasQuiz?: boolean;
  quizPassed?: boolean;
  isLoaded?: boolean;
  textBlocksRead?: string[];   // IDs dos blocos de texto lidos
  videosWatched?: string[];    // URLs dos vídeos assistidos
  audiosListened?: string[];   // IDs dos blocos de áudio ouvidos
}

export interface IContentBlock {
  id: string;
  type?: 'text' | 'text_answer';
  text: string;
  audioUrl?: string;
  spacing?: number;
  lineHeight?: string;
  featured?: boolean;
  featuredColor?: string;
}

export type LessonResourceType = 'PDF' | 'AUDIO' | 'IMAGE' | 'LINK' | 'FILE';

export interface LessonResource {
  id: string;
  title: string;
  type: LessonResourceType;
  url: string;
  position: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  dateEarned: Date;
  icon: string;
}

export class UserProgress {
  constructor(
    public readonly userId: string,
    public readonly lessonId: string,
    public readonly watchedSeconds: number,
    public readonly isCompleted: boolean,
    public readonly lastAccessedBlockId: string | null = null,
    // Campos de rastreamento detalhado
    public readonly videoProgress: number = 0,
    public readonly textBlocksRead: string[] = [],
    public readonly pdfsViewed: string[] = [],
    public readonly audiosPlayed: string[] = [],
    public readonly materialsAccessed: string[] = []
  ) { }

  /**
   * Calcula a porcentagem de progresso (Rich Domain Model)
   * @param durationSeconds Duração total da aula
   * @returns Porcentagem de 0 a 100
   */
  public calculateProgressPercentage(durationSeconds: number): number {
    if (durationSeconds <= 0) {
      return this.watchedSeconds > 0 ? 100 : 0;
    }
    return Math.round((this.watchedSeconds / durationSeconds) * 100);
  }

  /**
   * Verifica se uma ação já foi realizada
   */
  public hasReadTextBlock(blockId: string): boolean {
    return this.textBlocksRead.includes(blockId);
  }

  public hasViewedPdf(pdfId: string): boolean {
    return this.pdfsViewed.includes(pdfId);
  }

  public hasPlayedAudio(audioId: string): boolean {
    return this.audiosPlayed.includes(audioId);
  }

  public hasAccessedMaterial(materialId: string): boolean {
    return this.materialsAccessed.includes(materialId);
  }
}

export interface ForumMessage {
  id: string;
  lesson_id: string;
  user_id: string;
  content: string;
  created_at: string;
  is_edited: boolean;
  is_pinned?: boolean;
  parent_id?: string;
  image_url?: string;
  profiles?: {
    name: string | null;
    role: 'STUDENT' | 'INSTRUCTOR' | 'MASTER' | null;
  };
}

export class Lesson {
  private _id: string;
  private _title: string;
  private _videoUrl: string;
  private _videoUrls: { url: string; title: string; imageUrl?: string; type?: 'video' | 'slides'; slides?: string[]; fileUrl?: string; fileType?: 'pdf' | 'pptx' }[];
  private _content: string;
  private _audioUrl: string;
  private _imageUrl: string;
  private _resources: LessonResource[];
  private _durationSeconds: number;
  private _watchedSeconds: number;
  private _isCompleted: boolean;
  private _position: number;
  private _lastAccessedBlockId: string | null;
  private _contentBlocks: IContentBlock[];

  // Quiz System
  private _hasQuiz: boolean;
  private _quizPassed: boolean;
  private _isLoaded: boolean;

  // Dynamic Progress Tracking
  private _textBlocksRead: Set<string>;
  private _videosWatched: Set<string>;
  private _audiosListened: Set<string>;

  constructor(data: ILessonData) {
    this._id = data.id;
    this._title = data.title;
    this._videoUrl = data.videoUrl || '';
    this._videoUrls = data.videoUrls || [];
    this._content = data.content || '';
    this._audioUrl = data.audioUrl || '';
    this._imageUrl = data.imageUrl || '';
    this._resources = data.resources ? [...data.resources] : [];
    this._durationSeconds = data.durationSeconds;
    this._watchedSeconds = data.watchedSeconds || 0;
    this._isCompleted = data.isCompleted || false;
    this._position = data.position || 0;
    this._lastAccessedBlockId = data.lastAccessedBlockId || null;
    this._contentBlocks = data.contentBlocks ? [...data.contentBlocks] : [];
    this._hasQuiz = data.hasQuiz || false;
    this._quizPassed = data.quizPassed || false;
    this._isLoaded = data.isLoaded !== undefined ? data.isLoaded : true;
    this._textBlocksRead = new Set(data.textBlocksRead || []);
    this._videosWatched = new Set(data.videosWatched || []);
    this._audiosListened = new Set(data.audiosListened || []);
  }

  get id(): string { return this._id; }
  get title(): string { return this._title; }
  get videoUrl(): string { return this._videoUrl; }
  get videoUrls(): { url: string; title: string; imageUrl?: string; type?: 'video' | 'slides'; slides?: string[]; fileUrl?: string; fileType?: 'pdf' | 'pptx' }[] { return [...this._videoUrls]; }
  get content(): string { return this._content; }
  get audioUrl(): string { return this._audioUrl; }
  get imageUrl(): string { return this._imageUrl; }
  get resources(): LessonResource[] { return [...this._resources]; }
  get durationSeconds(): number { return this._durationSeconds; }
  get watchedSeconds(): number { return this._watchedSeconds; }
  get isCompleted(): boolean { return this._isCompleted; }
  get position(): number { return this._position; }
  get lastAccessedBlockId(): string | null { return this._lastAccessedBlockId; }
  get contentBlocks(): IContentBlock[] { return [...this._contentBlocks]; }
  get hasQuiz(): boolean { return this._hasQuiz; }
  get quizPassed(): boolean { return this._quizPassed; }
  get isLoaded(): boolean { return this._isLoaded; }
  get textBlocksRead(): string[] { return [...this._textBlocksRead]; }
  get videosWatched(): string[] { return [...this._videosWatched]; }
  get audiosListened(): string[] { return [...this._audiosListened]; }

  /**
   * Carrega o conteúdo da aula (Lazy Loading)
   */
  public loadContent(content: string, blocks: IContentBlock[], resources: LessonResource[]): void {
    this._content = content;
    this._contentBlocks = [...blocks];
    this._resources = [...resources];
    this._isLoaded = true;
  }

  // Setter para quiz passed (usado quando usuário passa no quiz)
  public setQuizPassed(passed: boolean): void {
    this._quizPassed = passed;
  }

  // Setter para hasQuiz (usado ao carregar dados)
  public setHasQuiz(has: boolean): void {
    this._hasQuiz = has;
  }

  public updateProgress(watched: number): boolean {
    if (watched < 0) throw new ValidationError('O tempo assistido não pode ser negativo.');

    const wasCompleted = this._isCompleted;

    this._watchedSeconds = Math.max(0, watched);

    // Check time-based progress (legacy/fallback)
    if (this._durationSeconds > 0) {
      this._watchedSeconds = Math.min(watched, this._durationSeconds);
      const timeProgress = (this._watchedSeconds / this._durationSeconds) * 100;
      if (timeProgress >= 90) this._isCompleted = true;
    } else if (this._watchedSeconds > 0) {
      this._isCompleted = true;
    }

    // Check dynamic item-based progress (text + audio + video)
    if (!this._isCompleted && this.calculateProgressPercentage() >= 90) {
      this._isCompleted = true;
    }

    return !wasCompleted && this._isCompleted;
  }

  /**
   * Calcula a porcentagem de progresso da aula (Rich Domain Model)
   * @returns Porcentagem de 0 a 100
   */
  public calculateProgressPercentage(): number {
    if (this._isCompleted) return 100;

    // Dynamic item-based progress model
    const textBlocks = this._contentBlocks.length;
    const audioBlocks = this._contentBlocks.filter(b => b.audioUrl).length;
    const videoCount = this._videoUrls.length + (this._videoUrl ? 1 : 0);
    const totalItems = textBlocks + audioBlocks + videoCount;

    // Fallback: no content blocks (legacy or video-only lesson)
    if (totalItems === 0) {
      if (this._durationSeconds <= 0) {
        return this._watchedSeconds > 0 ? 100 : 0;
      }
      return Math.min(100, Math.round((this._watchedSeconds / this._durationSeconds) * 100));
    }

    // Count consumed items
    const readBlocks = Math.min(this._textBlocksRead.size, textBlocks);
    const listenedAudios = Math.min(this._audiosListened.size, audioBlocks);
    const watchedVideos = Math.min(this._videosWatched.size, videoCount);
    const consumedItems = readBlocks + listenedAudios + watchedVideos;

    return Math.min(100, Math.round((consumedItems / totalItems) * 100));
  }

  /**
   * Marca um bloco de texto como lido
   */
  public markBlockAsRead(blockId: string): void {
    this._textBlocksRead.add(blockId);
  }

  /**
   * Marca um vídeo como assistido
   */
  public markVideoWatched(videoUrl: string): void {
    this._videosWatched.add(videoUrl);
  }

  /**
   * Marca um bloco de áudio como ouvido
   */
  public markAudioListened(blockId: string): void {
    this._audiosListened.add(blockId);
  }

  /**
   * Determina se a aula está REALMENTE concluída
   * Considera se há quiz e se o usuário passou nele (Rich Domain Model + Quiz System)
   * @returns true se aula está concluída E (não tem quiz OU passou no quiz)
   */
  /**
   * Clona a aula para gatilhar re-render do React (Immutability Pattern)
   */
  public clone(): Lesson {
    const data: ILessonData = {
      id: this._id,
      title: this._title,
      videoUrl: this._videoUrl,
      videoUrls: [...this._videoUrls],
      content: this._content,
      audioUrl: this._audioUrl,
      imageUrl: this._imageUrl,
      resources: [...this._resources],
      durationSeconds: this._durationSeconds,
      watchedSeconds: this._watchedSeconds,
      isCompleted: this._isCompleted,
      position: this._position,
      lastAccessedBlockId: this._lastAccessedBlockId,
      contentBlocks: [...this._contentBlocks],
      hasQuiz: this._hasQuiz,
      quizPassed: this._quizPassed,
      isLoaded: this._isLoaded,
      textBlocksRead: [...this._textBlocksRead],
      videosWatched: [...this._videosWatched],
      audiosListened: [...this._audiosListened]
    };
    return new Lesson(data);
  }
}

export class User {
  private _xp: number;
  private _level: number;
  private _achievements: Achievement[];

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    public role: 'STUDENT' | 'INSTRUCTOR' | 'MASTER',
    xp: number = 0,
    achievements: Achievement[] = [],
    public readonly geminiApiKey: string | null = null,
    public readonly approvalStatus: 'pending' | 'approved' | 'rejected' = 'approved',
    public readonly lastAccess: Date | null = null,
    public readonly isTempPassword: boolean = false,
    public readonly approvedAt: Date | null = null,
    public readonly approvedBy: string | null = null,
    public readonly rejectionReason: string | null = null,
    public readonly isMinor: boolean = false,
    public readonly avatarUrl: string | null = null // ADICIONADO
  ) {
    this._xp = xp;
    this._achievements = achievements;
    this._level = Math.floor(xp / 1000) + 1;
  }

  get xp(): number { return this._xp; }
  get level(): number { return this._level; }
  get achievements(): Achievement[] { return [...this._achievements]; }
  
  // Access and Role Getters
  get isStudent(): boolean { return this.role === 'STUDENT'; }
  get isInstructor(): boolean { return this.role === 'INSTRUCTOR'; }
  get isMaster(): boolean { return this.role === 'MASTER'; }
  get hasAdminPanelAccess(): boolean { return this.role === 'INSTRUCTOR' || this.role === 'MASTER'; }

  public addXp(amount: number): void {
    if (amount < 0) throw new ValidationError('A quantidade de XP deve ser positiva.');
    this._xp += amount;
    this._level = Math.floor(this._xp / 1000) + 1;
  }

  /**
   * Calcula o XP dentro do nível atual (Rich Domain Model)
   * @returns XP de 0 a 999
   */
  public calculateXpInCurrentLevel(): number {
    return this._xp % 1000;
  }

  /**
   * Calcula o XP restante para o próximo nível (Rich Domain Model)
   * @returns XP necessário para subir de nível
   */
  public getRemainingXpForNextLevel(): number {
    return 1000 - this.calculateXpInCurrentLevel();
  }

  /**
   * Calcula a porcentagem de progresso no nível atual (Rich Domain Model)
   * @returns Porcentagem de 0 a 100
   */
  public calculateLevelProgress(): number {
    return Math.round((this.calculateXpInCurrentLevel() / 1000) * 100);
  }

  public checkAndAddAchievements(type: 'LESSON' | 'MODULE' | 'COURSE' | 'XP' | 'LEVEL'): Achievement | null {
    let newlyUnlocked: Achievement | null = null;
    const hasAchievement = (id: string) => this._achievements.some(a => a.id === id);

    if (type === 'LESSON') {
      if (!hasAchievement('first-lesson')) {
        newlyUnlocked = {
          id: 'first-lesson',
          title: 'Primeiro Passo',
          description: 'Você concluiu sua primeira aula no sistema!',
          dateEarned: new Date(),
          icon: 'fa-rocket'
        };
        this._achievements.push(newlyUnlocked);
      }
    }

    if (type === 'MODULE') {
      if (!hasAchievement('module-master')) {
        newlyUnlocked = {
          id: 'module-master',
          title: 'Mestre do Módulo',
          description: 'Você completou um módulo inteiro!',
          dateEarned: new Date(),
          icon: 'fa-crown'
        };
        this._achievements.push(newlyUnlocked);
      }
    }

    if (type === 'COURSE') {
      if (!hasAchievement('course-complete')) {
        newlyUnlocked = {
          id: 'course-complete',
          title: 'Conquistador do Curso',
          description: 'Você completou todas as aulas deste curso!',
          dateEarned: new Date(),
          icon: 'fa-trophy'
        };
        this._achievements.push(newlyUnlocked);
      }
    }

    if (type === 'XP') {
      if (this._xp >= 5000 && !hasAchievement('xp-5000')) {
        newlyUnlocked = {
          id: 'xp-5000',
          title: 'Veterano do Estudo',
          description: 'Você alcançou 5.000 XP acumulados!',
          dateEarned: new Date(),
          icon: 'fa-award'
        };
        this._achievements.push(newlyUnlocked);
      } else if (this._xp >= 1000 && !hasAchievement('xp-1000')) {
        newlyUnlocked = {
          id: 'xp-1000',
          title: 'Aprendiz Dedicado',
          description: 'Você alcançou 1.000 XP acumulados!',
          dateEarned: new Date(),
          icon: 'fa-bolt'
        };
        this._achievements.push(newlyUnlocked);
      }
    }

    if (type === 'LEVEL') {
      if (this._level >= 5 && !hasAchievement('level-5')) {
        newlyUnlocked = {
          id: 'level-5',
          title: 'Mestre do Conhecimento',
          description: 'Respeito! Você atingiu o Nível 5.',
          dateEarned: new Date(),
          icon: 'fa-brain'
        };
        this._achievements.push(newlyUnlocked);
      }
    }

    return newlyUnlocked;
  }

  public isPending(): boolean {
    return this.approvalStatus === 'pending';
  }

  public isApproved(): boolean {
    return this.approvalStatus === 'approved';
  }

  public isRejected(): boolean {
    return this.approvalStatus === 'rejected';
  }

  public clone(): User {
    return new User(
      this.id,
      this.name,
      this.email,
      this.role,
      this._xp,
      [...this._achievements],
      this.geminiApiKey,
      this.approvalStatus,
      this.lastAccess,
      this.isTempPassword,
      this.approvedAt,
      this.approvedBy,
      this.rejectionReason,
      this.isMinor
    );
  }
}

export class Module {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly lessons: Lesson[],
    public readonly position: number = 0
  ) { }

  public isFullyCompleted(): boolean {
    return this.lessons.length > 0 && this.lessons.every(l => l.isCompleted);
  }
}

export class Course {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string,
    public readonly imageUrl: string | null,
    public readonly color: string | null = null,
    public readonly colorLegend: string | null = null,
    public readonly modules: Module[],
    public readonly instructorId: string | null = null,
    public readonly language: string | null = null,
    public readonly estimatedHours: number | null = null,
    public readonly level: string | null = null,
    public readonly teachingType: string | null = null,
    public readonly startDate: Date | null = null,
    public readonly endDate: Date | null = null,
    public readonly instructorName: string | null = null
  ) { }

  public isFullyCompleted(): boolean {
    return this.modules.length > 0 && this.modules.every(m => m.isFullyCompleted());
  }
}

/**
 * Representa uma inscrição de usuário em um curso
 */
export class CourseEnrollment {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly courseId: string,
    public readonly enrolledAt: Date,
    public readonly isActive: boolean = true
  ) { }
}

export type NotificationType = 'forum_reply' | 'direct_message' | 'system' | 'award';

export class Notification {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly title: string,
    public readonly message: string,
    public readonly type: NotificationType,
    public readonly senderId: string | null = null,
    public readonly link: string | null = null,
    public readonly isRead: boolean = false,
    public readonly createdAt: Date = new Date()
  ) { }
}
