import { redirect } from "next/navigation";

type SchoolRedirectPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function SchoolRedirectPage({
  params,
}: SchoolRedirectPageProps) {
  const { slug } = await params;
  redirect(`/unimap/${slug}`);
}
