-- Allow platform-admin "director" invitations alongside parent/teacher.
ALTER TABLE "center_invitations"
    DROP CONSTRAINT "center_invitations_kind_check";

ALTER TABLE "center_invitations"
    ADD CONSTRAINT "center_invitations_kind_check"
    CHECK ("kind" IN ('parent', 'teacher', 'director'));
