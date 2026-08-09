import { BadRequestException, NotFoundException } from '@nestjs/common';
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
    bio: null,
    interests: null,
    statusMessage: null,
    pickCount: 0,
    photos: [],
  };

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      setPremium: jest.fn(),
      updateProfile: jest.fn(),
      countPhotos: jest.fn(),
      addPhoto: jest.fn(),
      setPrimaryPhoto: jest.fn(),
      deletePhoto: jest.fn(),
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

  describe('사진첩', () => {
    it('사진을 추가하고 갱신된 "나"를 돌려준다', async () => {
      repo.countPhotos.mockResolvedValue(2);
      repo.findById.mockResolvedValue(viewer);

      await service.addPhoto('me', '/uploads/a.png');

      expect(repo.addPhoto).toHaveBeenCalledWith('me', '/uploads/a.png');
    });

    it('상한(9장)을 넘으면 400이고 저장하지 않는다', async () => {
      repo.countPhotos.mockResolvedValue(9);

      await expect(
        service.addPhoto('me', '/uploads/a.png'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.addPhoto).not.toHaveBeenCalled();
    });

    it('대표로 지정하면 갱신된 "나"를 돌려준다', async () => {
      repo.setPrimaryPhoto.mockResolvedValue(1);
      repo.findById.mockResolvedValue(viewer);

      await expect(service.setPrimaryPhoto('me', 'p2')).resolves.toEqual(
        viewer,
      );
      expect(repo.setPrimaryPhoto).toHaveBeenCalledWith('me', 'p2');
    });

    it('내 사진이 아니면 대표 지정도 NotFoundException', async () => {
      repo.setPrimaryPhoto.mockResolvedValue(0);

      await expect(
        service.setPrimaryPhoto('me', 'other'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('내 사진이 아니면(삭제 0건) NotFoundException', async () => {
      repo.deletePhoto.mockResolvedValue(0);

      await expect(service.removePhoto('me', 'other')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('삭제되면 갱신된 "나"를 돌려준다', async () => {
      repo.deletePhoto.mockResolvedValue(1);
      repo.findById.mockResolvedValue(viewer);

      await expect(service.removePhoto('me', 'p1')).resolves.toEqual(viewer);
    });
  });
});
