import api from "@/lib/axios-instance";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./Auth";
import defaultProfilePicture from "@/assets/default_profilePicture.webp";
import defaultProfileBanner from "@/assets/banner.png";

interface ResponseData {
  userId: string;
  username: string;
  email: string;
  profilePicture: string | null;
  profileBanner: string | null;
  bio: string;
  followerCount: number;
}

interface Profile {
  userId: string;
  username: string;
  email: string;
  profilePicture: string;
  profileBanner: string;
  bio: string;
  followerCount: number;
}

const defaultProfile: Profile = {
  userId: "",
  username: "user",
  email: "user@example.com",
  profilePicture: defaultProfilePicture,
  profileBanner: defaultProfileBanner,
  bio: "",
  followerCount: 0,
};

const fetchProfile = async (): Promise<Profile> => {
  const response = await api.get<ResponseData>("/user/profile");
  const profile: Profile = {
    ...response.data,
    profileBanner: response.data.profileBanner || defaultProfile.profileBanner,
    profilePicture:
      response.data.profilePicture || defaultProfile.profilePicture,
  };
  return profile;
};

const useProfile = () => {
  const { authState } = useAuth();
  const useQueryResult = useQuery(["profile"], fetchProfile, {
    staleTime: Infinity,
    retry: 1,
    enabled: !!authState,
  });
  return useQueryResult.data
    ? useQueryResult
    : { ...useQueryResult, data: defaultProfile };
};

export default useProfile;
