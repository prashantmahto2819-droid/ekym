// The volunteer form merged into the membership form (Phase 15): /volunteer → /join?interest=volunteer.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/volunteer")({
  beforeLoad: () => { throw redirect({ to: "/join", search: { interest: "volunteer" } }); },
  component: () => null,
});
