import { queryOptions } from "@tanstack/react-query";

import {
  getBlog,
  getBlogs,
  getBloodRequirements,
  getCampaign,
  getCampaigns,
  getGalleries,
  getHomeData,
  getInternshipPrograms,
  getLibraryData,
  getNewsItem,
  getNewsList,
  getOrganization,
  getReels,
  getSevaProject,
  getSevaProjects,
  getVideos,
  getCentralFeed,
  getIssues,
  getIssue,
  getPage,
  getHomePage,
  getMenus,
} from "./public.functions";

export const organizationQuery = () =>
  queryOptions({ queryKey: ["organization"], queryFn: () => getOrganization() });

export const homeQuery = () => queryOptions({ queryKey: ["home"], queryFn: () => getHomeData() });

export const sevaListQuery = () =>
  queryOptions({ queryKey: ["seva"], queryFn: () => getSevaProjects() });

export const sevaQuery = (slug: string) =>
  queryOptions({ queryKey: ["seva", slug], queryFn: () => getSevaProject({ data: { slug } }) });

export const blogListQuery = () => queryOptions({ queryKey: ["blogs"], queryFn: () => getBlogs() });

export const blogQuery = (slug: string) =>
  queryOptions({ queryKey: ["blog", slug], queryFn: () => getBlog({ data: { slug } }) });

export const newsListQuery = () =>
  queryOptions({ queryKey: ["news"], queryFn: () => getNewsList() });

export const newsQuery = (slug: string) =>
  queryOptions({ queryKey: ["news", slug], queryFn: () => getNewsItem({ data: { slug } }) });

export const campaignListQuery = () =>
  queryOptions({ queryKey: ["campaigns"], queryFn: () => getCampaigns() });

export const campaignQuery = (slug: string) =>
  queryOptions({ queryKey: ["campaign", slug], queryFn: () => getCampaign({ data: { slug } }) });

export const galleryQuery = () =>
  queryOptions({ queryKey: ["galleries"], queryFn: () => getGalleries() });

export const videoQuery = () => queryOptions({ queryKey: ["videos"], queryFn: () => getVideos() });

export const reelQuery = () => queryOptions({ queryKey: ["reels"], queryFn: () => getReels() });

export const bloodRequirementQuery = () =>
  queryOptions({ queryKey: ["blood-requirements"], queryFn: () => getBloodRequirements() });

export const libraryQuery = () =>
  queryOptions({ queryKey: ["library"], queryFn: () => getLibraryData() });

export const internshipQuery = () =>
  queryOptions({ queryKey: ["internship-programs"], queryFn: () => getInternshipPrograms() });

export const centralFeedQuery = () => queryOptions({ queryKey: ["central-feed"], queryFn: () => getCentralFeed() });
export const issuesQuery = () => queryOptions({ queryKey: ["issues"], queryFn: () => getIssues() });
export const issueQuery = (slug: string) => queryOptions({ queryKey: ["issue", slug], queryFn: () => getIssue({ data: { slug } }) });

export const pageQuery = (slug: string) => queryOptions({ queryKey: ["page", slug], queryFn: () => getPage({ data: { slug } }) });
export const homePageQuery = () => queryOptions({ queryKey: ["home-page"], queryFn: () => getHomePage() });
export const menusQuery = () => queryOptions({ queryKey: ["menus"], queryFn: () => getMenus(), staleTime: 60_000 });
