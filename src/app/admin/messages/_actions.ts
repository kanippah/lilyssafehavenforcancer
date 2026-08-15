"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSessionUser, isStaff } from "@/lib/auth";

export async function toggleMessageRead(messageId: string): Promise<void> {
  const user = await getSessionUser();
  if (!isStaff(user)) return;

  const message = await db.contactMessage.findUnique({ where: { id: messageId } });
  if (!message) return;

  await db.contactMessage.update({
    where: { id: messageId },
    data: { read: !message.read },
  });
  revalidatePath("/admin/messages");
}

export async function deleteMessage(messageId: string): Promise<void> {
  const user = await getSessionUser();
  if (!isStaff(user)) return;

  await db.contactMessage.deleteMany({ where: { id: messageId } });
  revalidatePath("/admin/messages");
}
