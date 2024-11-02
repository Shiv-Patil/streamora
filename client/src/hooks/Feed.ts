import api from "@/lib/axios-instance";
import { useQuery } from "@tanstack/react-query";
import type { Channel } from "@/hooks/Channel";
import { useAuth } from "@/hooks/Auth";
import { useCallback } from "react";

export interface Feed {
  feed: Channel[];
  nextCursor: string;
}

const useFeed = () => {
  const { authState } = useAuth();

  const fetchFeed = useCallback(async (): Promise<Feed> => {
    const res = await api.get<Feed>(authState ? "/feed" : "/feed");
    return res.data;
  }, [authState]);

  const useQueryResult = useQuery(["feed"], fetchFeed, {
    retry: false,
  });
  return useQueryResult;
};

export default useFeed;
