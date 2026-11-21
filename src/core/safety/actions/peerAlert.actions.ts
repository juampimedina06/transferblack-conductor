import { transferApi } from '../../api/transferApi';
import type {
  CancelPeerAlertResponse,
  FollowPeerAlertRequest,
  FollowPeerAlertResponse,
  TriggerPeerAlertRequest,
  TriggerPeerAlertResponse,
  UnfollowPeerAlertResponse,
} from '../interface/peerAlert.interface';

export const triggerPeerAlert = async (
  payload: TriggerPeerAlertRequest
): Promise<TriggerPeerAlertResponse> => {
  const { data } = await transferApi.post<TriggerPeerAlertResponse>(
    '/driver/safety/peer-alerts',
    payload
  );
  return data;
};

export const cancelPeerAlert = async (
  alertId: string
): Promise<CancelPeerAlertResponse> => {
  const { data } = await transferApi.post<CancelPeerAlertResponse>(
    `/driver/safety/peer-alerts/${alertId}/cancel`
  );
  return data;
};

export const followPeerAlert = async (
  alertId: string,
  payload?: FollowPeerAlertRequest
): Promise<FollowPeerAlertResponse> => {
  const { data } = await transferApi.post<FollowPeerAlertResponse>(
    `/driver/safety/peer-alerts/${alertId}/follow`,
    payload ?? {}
  );
  return data;
};

export const unfollowPeerAlert = async (
  alertId: string
): Promise<UnfollowPeerAlertResponse> => {
  const { data } = await transferApi.post<UnfollowPeerAlertResponse>(
    `/driver/safety/peer-alerts/${alertId}/unfollow`
  );
  return data;
};
