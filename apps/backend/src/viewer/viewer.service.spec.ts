import { NotFoundException } from '@nestjs/common';
import Viewer from './entities/viewer.entity';
import { ViewerRepository } from './viewer.repository';
import { ViewerService } from './viewer.service';

describe('ViewerService', () => {
  let service: ViewerService;
  let repo: jest.Mocked<ViewerRepository>;

  const viewer: Viewer = {
    id: 'me',
    displayName: '나',
    photoUrl: 'p',
    isPremium: false,
  };

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      setPremium: jest.fn(),
    } as unknown as jest.Mocked<ViewerRepository>;
    service = new ViewerService(repo);
  });

  it('현재 유저를 반환한다', async () => {
    repo.findById.mockResolvedValue(viewer);
    await expect(service.getViewer('me')).resolves.toEqual(viewer);
  });

  it('유저가 없으면 NotFoundException', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getViewer('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('구독하면 isPremium=true로 갱신한다', async () => {
    repo.setPremium.mockResolvedValue({ ...viewer, isPremium: true });

    const result = await service.subscribePremium('me');

    expect(repo.setPremium).toHaveBeenCalledWith('me', true);
    expect(result.isPremium).toBe(true);
  });
});
