export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'super_admin' | 'seksi_acara' | 'juri' | 'media_center' | 'peserta';
export type CompetitionType = 'individu' | 'kelompok';
export type CompetitionStatus = 'draft' | 'pendaftaran' | 'berlangsung' | 'selesai' | 'dibatalkan';
export type AggregationMethod = 'rata_rata' | 'total' | 'rata_rata_buang_ekstrem';
export type ParticipantStatus = 'menunggu_verifikasi' | 'terverifikasi' | 'ditolak' | 'mengundurkan_diri';
export type DocumentStatus = 'menunggu' | 'valid' | 'tidak_valid';
export type JudgeAssignmentStatus = 'diundang' | 'aktif' | 'nonaktif';
export type AssessmentStatus = 'draft' | 'terkirim' | 'final';
export type ScheduleStatus = 'terjadwal' | 'berlangsung' | 'selesai' | 'ditunda' | 'dibatalkan';
export type AnnouncementCategory = 'umum' | 'jadwal' | 'pemenang' | 'penting' | 'media';
export type ModerationStatus = 'menunggu' | 'disetujui' | 'ditolak';
export type ChallengeType = 'scan_qr' | 'kode_unik' | 'unggah_bukti' | 'input_panitia';
export type PointSource = 'scan_qr' | 'kode_unik' | 'verifikasi_bukti' | 'input_panitia' | 'penyesuaian';
export type SubmissionStatus = 'menunggu' | 'disetujui' | 'ditolak';
export type RedemptionStatus = 'menunggu' | 'disetujui' | 'diserahkan' | 'ditolak';
export type WinnerCategory = 'lomba' | 'challenge';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          nickname: string | null;
          phone: string | null;
          institution: string | null;
          avatar_url: string | null;
          role: UserRole;
          is_active: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          nickname?: string | null;
          phone?: string | null;
          institution?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          nickname?: string | null;
          phone?: string | null;
          institution?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_settings: {
        Row: {
          key: string;
          value: Json;
          description: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      competitions: {
        Row: {
          id: string;
          slug: string;
          name: string;
          short_name: string;
          description: string;
          theme_link: string | null;
          type: CompetitionType;
          status: CompetitionStatus;
          aggregation: AggregationMethod;
          min_team_members: number;
          max_team_members: number;
          max_participants: number | null;
          registration_open_at: string | null;
          registration_close_at: string | null;
          poster_url: string | null;
          rules: string | null;
          sort_order: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          short_name: string;
          description: string;
          theme_link?: string | null;
          type?: CompetitionType;
          status?: CompetitionStatus;
          aggregation?: AggregationMethod;
          min_team_members?: number;
          max_team_members?: number;
          max_participants?: number | null;
          registration_open_at?: string | null;
          registration_close_at?: string | null;
          poster_url?: string | null;
          rules?: string | null;
          sort_order?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          short_name?: string;
          description?: string;
          theme_link?: string | null;
          type?: CompetitionType;
          status?: CompetitionStatus;
          aggregation?: AggregationMethod;
          min_team_members?: number;
          max_team_members?: number;
          max_participants?: number | null;
          registration_open_at?: string | null;
          registration_close_at?: string | null;
          poster_url?: string | null;
          rules?: string | null;
          sort_order?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      competition_criteria: {
        Row: {
          id: string;
          competition_id: string;
          name: string;
          description: string | null;
          weight: number;
          max_score: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          competition_id: string;
          name: string;
          description?: string | null;
          weight?: number;
          max_score?: number;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          competition_id?: string;
          name?: string;
          description?: string | null;
          weight?: number;
          max_score?: number;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      participants: {
        Row: {
          id: string;
          user_id: string | null;
          registration_number: string;
          full_name: string;
          nickname: string | null;
          email: string | null;
          phone: string | null;
          institution: string | null;
          birth_date: string | null;
          address: string | null;
          photo_url: string | null;
          status: ParticipantStatus;
          verified_by: string | null;
          verified_at: string | null;
          rejection_reason: string | null;
          total_points: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          registration_number: string;
          full_name: string;
          nickname?: string | null;
          email?: string | null;
          phone?: string | null;
          institution?: string | null;
          birth_date?: string | null;
          address?: string | null;
          photo_url?: string | null;
          status?: ParticipantStatus;
          verified_by?: string | null;
          verified_at?: string | null;
          rejection_reason?: string | null;
          total_points?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          registration_number?: string;
          full_name?: string;
          nickname?: string | null;
          email?: string | null;
          phone?: string | null;
          institution?: string | null;
          birth_date?: string | null;
          address?: string | null;
          photo_url?: string | null;
          status?: ParticipantStatus;
          verified_by?: string | null;
          verified_at?: string | null;
          rejection_reason?: string | null;
          total_points?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      participant_documents: {
        Row: {
          id: string;
          participant_id: string;
          doc_type: string;
          file_url: string;
          file_name: string | null;
          status: DocumentStatus;
          note: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          doc_type: string;
          file_url: string;
          file_name?: string | null;
          status?: DocumentStatus;
          note?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          participant_id?: string;
          doc_type?: string;
          file_url?: string;
          file_name?: string | null;
          status?: DocumentStatus;
          note?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          uploaded_at?: string;
        };
        Relationships: [];
      };
      registrations: {
        Row: {
          id: string;
          participant_id: string;
          competition_id: string;
          team_name: string | null;
          performance_order: number | null;
          is_confirmed: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          competition_id: string;
          team_name?: string | null;
          performance_order?: number | null;
          is_confirmed?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          participant_id?: string;
          competition_id?: string;
          team_name?: string | null;
          performance_order?: number | null;
          is_confirmed?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      registration_members: {
        Row: {
          id: string;
          registration_id: string;
          member_name: string;
          member_role: string | null;
          student_id: string | null;
          institution: string | null;
          is_leader: boolean;
        };
        Insert: {
          id?: string;
          registration_id: string;
          member_name: string;
          member_role?: string | null;
          student_id?: string | null;
          institution?: string | null;
          is_leader?: boolean;
        };
        Update: {
          id?: string;
          registration_id?: string;
          member_name?: string;
          member_role?: string | null;
          student_id?: string | null;
          institution?: string | null;
          is_leader?: boolean;
        };
        Relationships: [];
      };
      competition_judges: {
        Row: {
          id: string;
          competition_id: string;
          judge_id: string;
          is_chief_judge: boolean;
          expertise_note: string | null;
          status: JudgeAssignmentStatus;
          assigned_by: string | null;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          competition_id: string;
          judge_id: string;
          is_chief_judge?: boolean;
          expertise_note?: string | null;
          status?: JudgeAssignmentStatus;
          assigned_by?: string | null;
          assigned_at?: string;
        };
        Update: {
          id?: string;
          competition_id?: string;
          judge_id?: string;
          is_chief_judge?: boolean;
          expertise_note?: string | null;
          status?: JudgeAssignmentStatus;
          assigned_by?: string | null;
          assigned_at?: string;
        };
        Relationships: [];
      };
      schedules: {
        Row: {
          id: string;
          competition_id: string | null;
          title: string;
          description: string | null;
          event_day: number;
          event_date: string;
          start_time: string;
          end_time: string | null;
          venue: string;
          stage: string | null;
          host_name: string | null;
          status: ScheduleStatus;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          competition_id?: string | null;
          title: string;
          description?: string | null;
          event_day?: number;
          event_date: string;
          start_time: string;
          end_time?: string | null;
          venue: string;
          stage?: string | null;
          host_name?: string | null;
          status?: ScheduleStatus;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          competition_id?: string | null;
          title?: string;
          description?: string | null;
          event_day?: number;
          event_date?: string;
          start_time?: string;
          end_time?: string | null;
          venue?: string;
          stage?: string | null;
          host_name?: string | null;
          status?: ScheduleStatus;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      assessments: {
        Row: {
          id: string;
          registration_id: string;
          competition_id: string;
          judge_id: string;
          status: AssessmentStatus;
          weighted_total: number;
          notes: string | null;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          registration_id: string;
          competition_id: string;
          judge_id: string;
          status?: AssessmentStatus;
          weighted_total?: number;
          notes?: string | null;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          registration_id?: string;
          competition_id?: string;
          judge_id?: string;
          status?: AssessmentStatus;
          weighted_total?: number;
          notes?: string | null;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      assessment_scores: {
        Row: {
          id: string;
          assessment_id: string;
          criterion_id: string;
          score: number;
          comment: string | null;
        };
        Insert: {
          id?: string;
          assessment_id: string;
          criterion_id: string;
          score?: number;
          comment?: string | null;
        };
        Update: {
          id?: string;
          assessment_id?: string;
          criterion_id?: string;
          score?: number;
          comment?: string | null;
        };
        Relationships: [];
      };
      announcements: {
        Row: {
          id: string;
          slug: string;
          title: string;
          category: AnnouncementCategory;
          body: string;
          cover_url: string | null;
          attachment_url: string | null;
          target_roles: UserRole[] | null;
          is_published: boolean;
          is_pinned: boolean;
          show_on_monitor: boolean;
          publish_at: string;
          expire_at: string | null;
          author_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          category?: AnnouncementCategory;
          body: string;
          cover_url?: string | null;
          attachment_url?: string | null;
          target_roles?: UserRole[] | null;
          is_published?: boolean;
          is_pinned?: boolean;
          show_on_monitor?: boolean;
          publish_at?: string;
          expire_at?: string | null;
          author_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          category?: AnnouncementCategory;
          body?: string;
          cover_url?: string | null;
          attachment_url?: string | null;
          target_roles?: UserRole[] | null;
          is_published?: boolean;
          is_pinned?: boolean;
          show_on_monitor?: boolean;
          publish_at?: string;
          expire_at?: string | null;
          author_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      winners: {
        Row: {
          id: string;
          category: WinnerCategory;
          competition_id: string | null;
          challenge_id: string | null;
          registration_id: string | null;
          participant_id: string | null;
          winner_name: string;
          institution: string | null;
          rank: number;
          title: string | null;
          final_score: number | null;
          prize: string | null;
          is_published: boolean;
          announced_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          category?: WinnerCategory;
          competition_id?: string | null;
          challenge_id?: string | null;
          registration_id?: string | null;
          participant_id?: string | null;
          winner_name: string;
          institution?: string | null;
          rank?: number;
          title?: string | null;
          final_score?: number | null;
          prize?: string | null;
          is_published?: boolean;
          announced_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          category?: WinnerCategory;
          competition_id?: string | null;
          challenge_id?: string | null;
          registration_id?: string | null;
          participant_id?: string | null;
          winner_name?: string;
          institution?: string | null;
          rank?: number;
          title?: string | null;
          final_score?: number | null;
          prize?: string | null;
          is_published?: boolean;
          announced_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      twibbons: {
        Row: {
          id: string;
          participant_id: string | null;
          user_id: string | null;
          uploader_name: string;
          uploader_institution: string | null;
          caption: string | null;
          image_url: string;
          uploader_ip: string | null;
          status: ModerationStatus;
          is_featured: boolean;
          moderated_by: string | null;
          moderated_at: string | null;
          reject_reason: string | null;
          likes_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_id?: string | null;
          user_id?: string | null;
          uploader_name: string;
          uploader_institution?: string | null;
          caption?: string | null;
          image_url: string;
          uploader_ip?: string | null;
          status?: ModerationStatus;
          is_featured?: boolean;
          moderated_by?: string | null;
          moderated_at?: string | null;
          reject_reason?: string | null;
          likes_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          participant_id?: string | null;
          user_id?: string | null;
          uploader_name?: string;
          uploader_institution?: string | null;
          caption?: string | null;
          image_url?: string;
          uploader_ip?: string | null;
          status?: ModerationStatus;
          is_featured?: boolean;
          moderated_by?: string | null;
          moderated_at?: string | null;
          reject_reason?: string | null;
          likes_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      challenges: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string;
          type: ChallengeType;
          point_reward: number;
          max_claims: number | null;
          banner_url: string | null;
          badge_icon: string | null;
          start_at: string;
          end_at: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description: string;
          type?: ChallengeType;
          point_reward?: number;
          max_claims?: number | null;
          banner_url?: string | null;
          badge_icon?: string | null;
          start_at?: string;
          end_at?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string;
          type?: ChallengeType;
          point_reward?: number;
          max_claims?: number | null;
          banner_url?: string | null;
          badge_icon?: string | null;
          start_at?: string;
          end_at?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      stands: {
        Row: {
          id: string;
          competition_id: string | null;
          name: string;
          code: string;
          qr_token: string;
          description: string | null;
          booth_location: string | null;
          points_per_visit: number;
          max_visits_per_participant: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          competition_id?: string | null;
          name: string;
          code: string;
          qr_token?: string;
          description?: string | null;
          booth_location?: string | null;
          points_per_visit?: number;
          max_visits_per_participant?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          competition_id?: string | null;
          name?: string;
          code?: string;
          qr_token?: string;
          description?: string | null;
          booth_location?: string | null;
          points_per_visit?: number;
          max_visits_per_participant?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      point_transactions: {
        Row: {
          id: string;
          participant_id: string;
          challenge_id: string | null;
          stand_id: string | null;
          points: number;
          source: PointSource;
          note: string | null;
          granted_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          challenge_id?: string | null;
          stand_id?: string | null;
          points: number;
          source: PointSource;
          note?: string | null;
          granted_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          participant_id?: string;
          challenge_id?: string | null;
          stand_id?: string | null;
          points?: number;
          source?: PointSource;
          note?: string | null;
          granted_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      challenge_submissions: {
        Row: {
          id: string;
          challenge_id: string;
          participant_id: string;
          proof_url: string | null;
          proof_type: string | null;
          description: string | null;
          status: SubmissionStatus;
          points_awarded: number;
          verified_by: string | null;
          verified_at: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          participant_id: string;
          proof_url?: string | null;
          proof_type?: string | null;
          description?: string | null;
          status?: SubmissionStatus;
          points_awarded?: number;
          verified_by?: string | null;
          verified_at?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          participant_id?: string;
          proof_url?: string | null;
          proof_type?: string | null;
          description?: string | null;
          status?: SubmissionStatus;
          points_awarded?: number;
          verified_by?: string | null;
          verified_at?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      rewards: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          points_required: number;
          quota: number | null;
          claimed_count: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          points_required: number;
          quota?: number | null;
          claimed_count?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          points_required?: number;
          quota?: number | null;
          claimed_count?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      reward_redemptions: {
        Row: {
          id: string;
          reward_id: string;
          participant_id: string;
          points_spent: number;
          status: RedemptionStatus;
          pickup_code: string | null;
          processed_by: string | null;
          processed_at: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reward_id: string;
          participant_id: string;
          points_spent: number;
          status?: RedemptionStatus;
          pickup_code?: string | null;
          processed_by?: string | null;
          processed_at?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          reward_id?: string;
          participant_id?: string;
          points_spent?: number;
          status?: RedemptionStatus;
          pickup_code?: string | null;
          processed_by?: string | null;
          processed_at?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      media_contents: {
        Row: {
          id: string;
          title: string;
          slug: string | null;
          content_type: string;
          excerpt: string | null;
          body: string | null;
          file_url: string | null;
          thumbnail_url: string | null;
          tags: string[] | null;
          is_published: boolean;
          author_id: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug?: string | null;
          content_type?: string;
          excerpt?: string | null;
          body?: string | null;
          file_url?: string | null;
          thumbnail_url?: string | null;
          tags?: string[] | null;
          is_published?: boolean;
          author_id?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string | null;
          content_type?: string;
          excerpt?: string | null;
          body?: string | null;
          file_url?: string | null;
          thumbnail_url?: string | null;
          tags?: string[] | null;
          is_published?: boolean;
          author_id?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      monitor_displays: {
        Row: {
          id: string;
          slug: string;
          name: string;
          layout_type: string;
          rotation_interval_seconds: number;
          theme: string;
          access_token: string | null;
          is_active: boolean;
          emergency_message: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          layout_type?: string;
          rotation_interval_seconds?: number;
          theme?: string;
          access_token?: string | null;
          is_active?: boolean;
          emergency_message?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          layout_type?: string;
          rotation_interval_seconds?: number;
          theme?: string;
          access_token?: string | null;
          is_active?: boolean;
          emergency_message?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      monitor_playlist_items: {
        Row: {
          id: string;
          display_id: string;
          module_key: string;
          competition_id: string | null;
          duration_seconds: number;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          display_id: string;
          module_key: string;
          competition_id?: string | null;
          duration_seconds?: number;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          display_id?: string;
          module_key?: string;
          competition_id?: string | null;
          duration_seconds?: number;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_role: UserRole | null;
          action: string;
          entity: string;
          entity_id: string | null;
          description: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_role?: UserRole | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          actor_role?: UserRole | null;
          action?: string;
          entity?: string;
          entity_id?: string | null;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string | null;
          type: string;
          link: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body?: string | null;
          type?: string;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          body?: string | null;
          type?: string;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      puzzle_items: {
        Row: {
          id: string;
          costume_name: string;
          region_name: string;
          costume_image_url: string | null;
          hint: string | null;
          sort_order: number;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          costume_name: string;
          region_name: string;
          costume_image_url?: string | null;
          hint?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          costume_name?: string;
          region_name?: string;
          costume_image_url?: string | null;
          hint?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      puzzle_attempts: {
        Row: {
          id: string;
          participant_id: string;
          total_items: number;
          correct_count: number;
          score: number;
          time_seconds: number | null;
          answers: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          total_items?: number;
          correct_count?: number;
          score?: number;
          time_seconds?: number | null;
          answers?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          participant_id?: string;
          total_items?: number;
          correct_count?: number;
          score?: number;
          time_seconds?: number | null;
          answers?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "puzzle_attempts_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["id"];
          }
        ];
      };
      qr_letter_challenges: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          target_phrase: string;
          points_reward: number;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          target_phrase: string;
          points_reward?: number;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          target_phrase?: string;
          points_reward?: number;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      qr_letter_codes: {
        Row: {
          id: string;
          challenge_id: string;
          letter: string;
          letter_index: number;
          qr_token: string;
          location_hint: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          letter: string;
          letter_index: number;
          qr_token: string;
          location_hint?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          letter?: string;
          letter_index?: number;
          qr_token?: string;
          location_hint?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "qr_letter_codes_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "qr_letter_challenges";
            referencedColumns: ["id"];
          }
        ];
      };
      qr_letter_scans: {
        Row: {
          id: string;
          challenge_id: string;
          participant_id: string;
          qr_code_id: string;
          scanned_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          participant_id: string;
          qr_code_id: string;
          scanned_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          participant_id?: string;
          qr_code_id?: string;
          scanned_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "qr_letter_scans_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "qr_letter_scans_qr_code_id_fkey";
            columns: ["qr_code_id"];
            isOneToOne: false;
            referencedRelation: "qr_letter_codes";
            referencedColumns: ["id"];
          }
        ];
      };
      qr_letter_submissions: {
        Row: {
          id: string;
          challenge_id: string;
          participant_id: string;
          submitted_phrase: string;
          is_correct: boolean;
          score: number;
          time_seconds: number | null;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          participant_id: string;
          submitted_phrase: string;
          is_correct?: boolean;
          score?: number;
          time_seconds?: number | null;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          participant_id?: string;
          submitted_phrase?: string;
          is_correct?: boolean;
          score?: number;
          time_seconds?: number | null;
          submitted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "qr_letter_submissions_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      v_assessment_totals: {
        Row: {
          assessment_id: string;
          registration_id: string;
          competition_id: string;
          judge_id: string;
          status: AssessmentStatus;
          submitted_at: string | null;
          weighted_total: number;
        };
        Relationships: [];
      };
      v_competition_final_score: {
        Row: {
          competition_id: string;
          registration_id: string;
          judges_count: number;
          average_score: number;
          sum_score: number;
          trimmed_average_score: number | null;
        };
        Relationships: [];
      };
      twibbon_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          image_url: string;
          thumbnail_url: string | null;
          is_active: boolean;
          sort_order: number;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          image_url: string;
          thumbnail_url?: string | null;
          is_active?: boolean;
          sort_order?: number;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          image_url?: string;
          thumbnail_url?: string | null;
          is_active?: boolean;
          sort_order?: number;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      current_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_staff: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
  };
}
