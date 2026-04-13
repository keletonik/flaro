CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"task_number" text,
	"site" text NOT NULL,
	"address" text,
	"client" text NOT NULL,
	"contact_name" text,
	"contact_number" text,
	"contact_email" text,
	"action_required" text NOT NULL,
	"priority" text NOT NULL,
	"status" text NOT NULL,
	"assigned_tech" text,
	"due_date" text,
	"notes" text,
	"uptick_notes" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" text PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"category" text NOT NULL,
	"owner" text DEFAULT 'Casper' NOT NULL,
	"status" text DEFAULT 'Open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "toolbox" (
	"id" text PRIMARY KEY NOT NULL,
	"ref" text NOT NULL,
	"text" text NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" text PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"priority" text DEFAULT 'Medium' NOT NULL,
	"category" text DEFAULT 'Work',
	"due_date" text,
	"assignee" text,
	"urgency_tag" text,
	"color_code" text,
	"notes" text,
	"next_steps" text,
	"dependencies" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'To Do' NOT NULL,
	"priority" text DEFAULT 'Medium' NOT NULL,
	"assignee" text,
	"due_date" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'Active' NOT NULL,
	"priority" text DEFAULT 'Medium' NOT NULL,
	"colour" text DEFAULT '#7C3AED',
	"due_date" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wip_records" (
	"id" text PRIMARY KEY NOT NULL,
	"task_number" text,
	"site" text NOT NULL,
	"address" text,
	"client" text NOT NULL,
	"job_type" text,
	"description" text,
	"status" text DEFAULT 'Open' NOT NULL,
	"priority" text DEFAULT 'Medium',
	"assigned_tech" text,
	"due_date" text,
	"date_created" text,
	"quote_amount" numeric(12, 2),
	"invoice_amount" numeric(12, 2),
	"po_number" text,
	"notes" text,
	"raw_data" jsonb,
	"import_batch_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"task_number" text,
	"quote_number" text,
	"site" text NOT NULL,
	"address" text,
	"client" text NOT NULL,
	"description" text,
	"quote_amount" numeric(12, 2),
	"status" text DEFAULT 'Draft' NOT NULL,
	"date_created" text,
	"date_sent" text,
	"date_accepted" text,
	"valid_until" text,
	"assigned_tech" text,
	"contact_name" text,
	"contact_email" text,
	"notes" text,
	"raw_data" jsonb,
	"import_batch_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "defects" (
	"id" text PRIMARY KEY NOT NULL,
	"task_number" text,
	"site" text NOT NULL,
	"address" text,
	"client" text NOT NULL,
	"description" text NOT NULL,
	"severity" text DEFAULT 'Medium',
	"status" text DEFAULT 'Open' NOT NULL,
	"building_class" text,
	"asset_type" text,
	"location" text,
	"recommendation" text,
	"due_date" text,
	"date_identified" text,
	"notes" text,
	"raw_data" jsonb,
	"import_batch_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_number" text,
	"task_number" text,
	"site" text NOT NULL,
	"address" text,
	"client" text NOT NULL,
	"description" text,
	"amount" numeric(12, 2),
	"gst_amount" numeric(12, 2),
	"total_amount" numeric(12, 2),
	"status" text DEFAULT 'Draft' NOT NULL,
	"date_issued" text,
	"date_due" text,
	"date_paid" text,
	"payment_terms" text,
	"notes" text,
	"raw_data" jsonb,
	"import_batch_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "supplier_products" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"product_name" text NOT NULL,
	"product_code" text,
	"category" text,
	"brand" text,
	"unit_price" numeric(12, 2),
	"unit" text DEFAULT 'each',
	"description" text,
	"notes" text,
	"raw_data" jsonb,
	"import_batch_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'General',
	"contact_name" text,
	"phone" text,
	"email" text,
	"website" text,
	"address" text,
	"suburb" text,
	"account_number" text,
	"payment_terms" text,
	"notes" text,
	"rating" text DEFAULT 'Approved',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"date" text NOT NULL,
	"start_hour" integer DEFAULT 9 NOT NULL,
	"end_hour" integer DEFAULT 10 NOT NULL,
	"location" text,
	"assigned_to" text,
	"color" text DEFAULT '#3B82F6',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pm_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"item_id" text,
	"action" text NOT NULL,
	"field" text,
	"old_value" text,
	"new_value" text,
	"comment" text,
	"user_id" text DEFAULT 'casper',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pm_boards" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"template" text DEFAULT 'blank',
	"color" text DEFAULT '#3B82F6',
	"icon" text DEFAULT 'folder',
	"default_view" text DEFAULT 'table',
	"archived" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pm_columns" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"width" integer DEFAULT 150,
	"options" jsonb,
	"required" boolean DEFAULT false,
	"hidden" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pm_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#3B82F6',
	"collapsed" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pm_items" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"group_id" text,
	"parent_id" text,
	"name" text NOT NULL,
	"values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0,
	"archived" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pm_views" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "on_call_roster" (
	"id" text PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"tech_name" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"contact_name" text,
	"contact_phone" text,
	"contact_email" text,
	"address" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"address" text,
	"suburb" text,
	"client_id" text,
	"building_class" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_history" (
	"id" text PRIMARY KEY NOT NULL,
	"section" text NOT NULL,
	"title" text NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"password_algo" text DEFAULT 'sha256-legacy' NOT NULL,
	"password_salt" text,
	"role" text DEFAULT 'user' NOT NULL,
	"email" text,
	"must_change_password" text DEFAULT 'false',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"role" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uptick_facts" (
	"id" text PRIMARY KEY NOT NULL,
	"import_id" text NOT NULL,
	"raw_row_id" text,
	"fact_type" text NOT NULL,
	"task_number" text,
	"quote_number" text,
	"client" text,
	"site" text,
	"service_group" text,
	"cost_center" text,
	"branch" text,
	"account_manager" text,
	"technician" text,
	"task_category" text,
	"status" text,
	"stage" text,
	"severity" text,
	"asset_type" text,
	"period_date" text,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"revenue" numeric(14, 2),
	"cost" numeric(14, 2),
	"labour_cost" numeric(14, 2),
	"material_cost" numeric(14, 2),
	"other_cost" numeric(14, 2),
	"hours" numeric(10, 2),
	"quantity" integer,
	"markup" numeric(10, 4),
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "uptick_imports" (
	"id" text PRIMARY KEY NOT NULL,
	"dashboard_type" text NOT NULL,
	"source_filename" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"imported_by" text,
	"row_count" integer DEFAULT 0 NOT NULL,
	"fact_count" integer DEFAULT 0 NOT NULL,
	"raw_headers" jsonb,
	"column_map" jsonb,
	"detected_confidence" numeric(5, 4),
	"warnings" jsonb,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "uptick_raw_rows" (
	"id" text PRIMARY KEY NOT NULL,
	"import_id" text NOT NULL,
	"row_index" integer NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pm_columns" ADD CONSTRAINT "pm_columns_board_id_pm_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."pm_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pm_groups" ADD CONSTRAINT "pm_groups_board_id_pm_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."pm_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pm_items" ADD CONSTRAINT "pm_items_board_id_pm_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."pm_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pm_items" ADD CONSTRAINT "pm_items_group_id_pm_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."pm_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pm_views" ADD CONSTRAINT "pm_views_board_id_pm_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."pm_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_conversation_id_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "jobs_priority_idx" ON "jobs" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "jobs_created_at_idx" ON "jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notes_status_idx" ON "notes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notes_category_idx" ON "notes" USING btree ("category");--> statement-breakpoint
CREATE INDEX "notes_created_at_idx" ON "notes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "todos_completed_idx" ON "todos" USING btree ("completed");--> statement-breakpoint
CREATE INDEX "todos_created_at_idx" ON "todos" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "project_tasks_project_id_idx" ON "project_tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_tasks_status_idx" ON "project_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_tasks_position_idx" ON "project_tasks" USING btree ("position");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "projects_created_at_idx" ON "projects" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "wip_status_idx" ON "wip_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "wip_client_idx" ON "wip_records" USING btree ("client");--> statement-breakpoint
CREATE INDEX "wip_import_batch_idx" ON "wip_records" USING btree ("import_batch_id");--> statement-breakpoint
CREATE INDEX "wip_created_at_idx" ON "wip_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "quotes_status_idx" ON "quotes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quotes_client_idx" ON "quotes" USING btree ("client");--> statement-breakpoint
CREATE INDEX "quotes_created_at_idx" ON "quotes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "defects_status_idx" ON "defects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "defects_severity_idx" ON "defects" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "defects_client_idx" ON "defects" USING btree ("client");--> statement-breakpoint
CREATE INDEX "defects_created_at_idx" ON "defects" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_client_idx" ON "invoices" USING btree ("client");--> statement-breakpoint
CREATE INDEX "invoices_created_at_idx" ON "invoices" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "supplier_products_supplier_id_idx" ON "supplier_products" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "supplier_products_category_idx" ON "supplier_products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "supplier_products_product_name_idx" ON "supplier_products" USING btree ("product_name");--> statement-breakpoint
CREATE INDEX "supplier_products_created_at_idx" ON "supplier_products" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "suppliers_category_idx" ON "suppliers" USING btree ("category");--> statement-breakpoint
CREATE INDEX "suppliers_name_idx" ON "suppliers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "suppliers_created_at_idx" ON "suppliers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "schedule_events_date_idx" ON "schedule_events" USING btree ("date");--> statement-breakpoint
CREATE INDEX "pm_activity_board_id_idx" ON "pm_activity" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "pm_activity_item_id_idx" ON "pm_activity" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "pm_activity_created_at_idx" ON "pm_activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pm_boards_archived_idx" ON "pm_boards" USING btree ("archived");--> statement-breakpoint
CREATE INDEX "pm_columns_board_id_idx" ON "pm_columns" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "pm_groups_board_id_idx" ON "pm_groups" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "pm_items_board_id_idx" ON "pm_items" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "pm_items_group_id_idx" ON "pm_items" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "pm_items_parent_id_idx" ON "pm_items" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "pm_views_board_id_idx" ON "pm_views" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "clients_normalized_name_idx" ON "clients" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "clients_name_idx" ON "clients" USING btree ("name");--> statement-breakpoint
CREATE INDEX "sites_normalized_name_idx" ON "sites" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "sites_client_id_idx" ON "sites" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "chat_history_section_idx" ON "chat_history" USING btree ("section");--> statement-breakpoint
CREATE INDEX "chat_history_updated_idx" ON "chat_history" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "uptick_facts_import_idx" ON "uptick_facts" USING btree ("import_id");--> statement-breakpoint
CREATE INDEX "uptick_facts_type_idx" ON "uptick_facts" USING btree ("fact_type");--> statement-breakpoint
CREATE INDEX "uptick_facts_client_idx" ON "uptick_facts" USING btree ("client");--> statement-breakpoint
CREATE INDEX "uptick_facts_technician_idx" ON "uptick_facts" USING btree ("technician");--> statement-breakpoint
CREATE INDEX "uptick_facts_service_group_idx" ON "uptick_facts" USING btree ("service_group");--> statement-breakpoint
CREATE INDEX "uptick_facts_period_idx" ON "uptick_facts" USING btree ("period_date");--> statement-breakpoint
CREATE INDEX "uptick_facts_status_idx" ON "uptick_facts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "uptick_facts_deleted_at_idx" ON "uptick_facts" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "uptick_imports_dashboard_type_idx" ON "uptick_imports" USING btree ("dashboard_type");--> statement-breakpoint
CREATE INDEX "uptick_imports_imported_at_idx" ON "uptick_imports" USING btree ("imported_at");--> statement-breakpoint
CREATE INDEX "uptick_imports_deleted_at_idx" ON "uptick_imports" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "uptick_raw_rows_import_idx" ON "uptick_raw_rows" USING btree ("import_id");