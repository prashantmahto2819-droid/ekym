import { createFileRoute } from "@tanstack/react-router";

import { PostsPage } from "@/components/admin/PostsPage";

export const Route = createFileRoute("/_authenticated/admin/news")({ component: () => <PostsPage kind="news" /> });
