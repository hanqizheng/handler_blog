type ToastLevel = "success" | "error" | "message";

const notify = (level: ToastLevel, message: string) => {
  if (level === "error") {
    console.error(message);
    return;
  }
  console.log(message);
};

export const toast = {
  success: (message: string) => notify("success", message),
  error: (message: string) => notify("error", message),
  message: (message: string) => notify("message", message),
};
