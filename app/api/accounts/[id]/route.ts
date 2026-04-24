import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const a = await prisma.account.findUnique({ where: { id: params.id } })
  if (!a) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Never return raw tokens to the client
  return NextResponse.json({
    id: a.id,
    platform: a.platform,
    username: a.username,
    pageId: a.pageId,
    extraData: a.extraData,
    createdAt: a.createdAt,
    hasAccessToken: !!a.accessToken,
    hasRefreshToken: !!a.refreshToken,
  })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json()
  const updateData: any = {}
  if (body.username !== undefined) updateData.username = body.username
  if (body.accessToken !== undefined && body.accessToken !== '') updateData.accessToken = body.accessToken
  if (body.pageId !== undefined) updateData.pageId = body.pageId
  if (body.extraData !== undefined) {
    updateData.extraData = typeof body.extraData === 'object'
      ? JSON.stringify(body.extraData)
      : body.extraData
  }
  const updated = await prisma.account.update({ where: { id: params.id }, data: updateData })
  return NextResponse.json({
    id: updated.id,
    platform: updated.platform,
    username: updated.username,
    pageId: updated.pageId,
    createdAt: updated.createdAt,
  })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.account.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
