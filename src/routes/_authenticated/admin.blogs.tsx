import { createFileRoute } from "@tanstack/react-router";

import { PostsPage } from "@/components/admin/PostsPage";

export const Route = createFileRoute("/_authenticated/admin/blogs")({ component: () => <PostsPage kind="blog" /> });
