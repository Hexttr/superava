import { redirect } from "next/navigation";

function firstSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OnboardingPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const socialSignup = firstSearchParam(searchParams.socialSignup);
  const target = socialSignup ? `/?socialSignup=${encodeURIComponent(socialSignup)}#profile` : "/#profile";
  redirect(target);
}
