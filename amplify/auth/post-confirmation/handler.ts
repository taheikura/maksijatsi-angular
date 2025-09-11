import type { PostConfirmationTriggerHandler } from "aws-lambda";

export const handler: PostConfirmationTriggerHandler = async (event) => {
  try {
    console.log('PostConfirmation triggered for user:', event.userName);
    
    // For now, just log the event and return success
    // The user profile will be created when they first access the app
    console.log('User attributes:', event.request.userAttributes);
    
    return event;
  } catch (error) {
    console.error('PostConfirmation error:', error);
    // Don't throw - allow user creation to succeed
    return event;
  }
};