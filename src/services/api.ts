import * as signalR from '@microsoft/signalr';

export const API_URL = 'http://localhost:5000';

export const createHubConnection = () => {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${API_URL}/chathub`)
    .withAutomaticReconnect()
    .build();
};