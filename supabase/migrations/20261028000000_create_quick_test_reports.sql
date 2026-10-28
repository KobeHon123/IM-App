/*
  # Create quick_test_reports table

  Quick Test Report requests submitted by users. Everyone who is signed in can
  read all requests and submit their own. Only users whose profile role is
  'dev' can update a request (to record the test result).
*/

CREATE TABLE IF NOT EXISTS quick_test_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  applicant_name text NOT NULL,
  material_info text NOT NULL,
  vendor text NOT NULL,
  testing_surface text NOT NULL,
  sample_quantity text NOT NULL,
  sample_dimensions text NOT NULL,
  antimicrobial_info text NOT NULL,
  final_application text NOT NULL,
  project_id text REFERENCES projects(id) ON DELETE SET NULL,
  project_name text,
  picture_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed')),
  result_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  result_updated_by_name text,
  result_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quick_test_reports_created_at_idx ON quick_test_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS quick_test_reports_status_idx ON quick_test_reports(status);

ALTER TABLE quick_test_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read quick test reports"
  ON quick_test_reports
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can submit their own quick test reports"
  ON quick_test_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Dev users can update quick test reports"
  ON quick_test_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND lower(profiles.role) = 'dev'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND lower(profiles.role) = 'dev'
    )
  );

CREATE POLICY "Owners and dev users can delete quick test reports"
  ON quick_test_reports
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND lower(profiles.role) = 'dev'
    )
  );
