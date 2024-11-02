import api from "@/lib/axios-instance";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./Auth";

export interface Following {
  username: string;
  profilePicture: string | null;
  isLive: boolean;
}

export interface Profile {
  userId: string;
  username: string;
  email: string;
  profilePicture: string | null;
  profileBanner: string | null;
  bio: string;
  followerCount: number;
  following: Following[];
  streamCategories: string[];
  currentStreamId: number | null;
  streamKey: string;
}

const fetchProfile = async (): Promise<Profile> => {
  const res = await api.get<Profile>("/user/profile");
  return res.data;
};

const useProfile = () => {
  const { authState } = useAuth();
  const useQueryResult = useQuery(["profile"], fetchProfile, {
    staleTime: Infinity,
    retry: false,
    enabled: !!authState,
    refetchOnWindowFocus: false,
  });
  return useQueryResult;
};

export default useProfile;
