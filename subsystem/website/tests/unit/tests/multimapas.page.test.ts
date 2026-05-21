/**
 * Unit tests for getStaticPaths and getStaticProps in multimapas page.
 *
 * Strategy: jest.mock (hoisted) for src/multimapas/projects — no singletons,
 * no need for isolateModules. Heavy React/map dependencies are stubbed out so
 * the server-side functions can be exercised in isolation.
 *
 * Test plan:
 *  getStaticPaths (2): one path per project, fallback === 'blocking'
 *  getStaticProps (5): happy path, params undefined, project undefined,
 *                      regions empty, getProjectByName throws
 */

// ---------------------------------------------------------------------------
// Mock heavy module-level side-effects that would break Jest
// (maplibre-gl, React component tree, etc.)
// ---------------------------------------------------------------------------

import type { Project } from 'src/multimapas/projects';
import { getProjectByName, listAllProjects } from 'src/multimapas/projects';
import { getStaticPaths, getStaticProps } from 'src/pages/[project]/multimapas';

jest.mock('src/multimapas/GeoVisMapWrapper', () => {
  return {};
});
jest.mock('src/multimapas/Insights', () => {
  return {};
});
jest.mock('src/multimapas/react/SyncCameraProvider', () => {
  return {};
});

// ---------------------------------------------------------------------------
// Module mock — intercept all Google API / project-fetching calls
// ---------------------------------------------------------------------------

jest.mock('src/multimapas/projects', () => {
  return {
    getProjectByName: jest.fn(),
    listAllProjects: jest.fn(),
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeProject = (overrides: Partial<Project> = {}): Project => {
  return {
    id: 'proj-1',
    name: 'TestProject',
    ai: null,
    dictionary: null,
    regions: [
      {
        name: 'Region1',
        mapConfig: {
          geoJsonKey: 'cd_key',
          geoJsonUrl: 'https://example.com/geo.geojson',
          zoom: 10,
        },
        variables: [],
        locations: [{ code: 'A001', name: 'Location A' }],
      },
    ],
    ...overrides,
  };
};

// ---------------------------------------------------------------------------
// getStaticPaths
// ---------------------------------------------------------------------------

describe('getStaticPaths', () => {
  test('generates one path per project returned by listAllProjects', async () => {
    (listAllProjects as jest.Mock).mockResolvedValue([
      { id: 'p1', name: 'Alpha', ai: null, dictionary: null, regions: [] },
      { id: 'p2', name: 'Beta', ai: null, dictionary: null, regions: [] },
    ]);

    const result = await getStaticPaths({});

    expect(result.paths).toHaveLength(2);
    expect(result.paths).toEqual(
      expect.arrayContaining([
        { params: { project: 'Alpha' } },
        { params: { project: 'Beta' } },
      ])
    );
  });

  test('fallback is "blocking"', async () => {
    (listAllProjects as jest.Mock).mockResolvedValue([]);

    const result = await getStaticPaths({});

    expect(result.fallback).toBe('blocking');
  });
});

// ---------------------------------------------------------------------------
// getStaticProps
// ---------------------------------------------------------------------------

describe('getStaticProps', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('happy path: returns props.project and revalidate 3600', async () => {
    const project = makeProject();
    (getProjectByName as jest.Mock).mockResolvedValue(project);

    const result = await getStaticProps({ params: { project: 'TestProject' } });

    expect(result).toEqual({ props: { project }, revalidate: 3600 });
  });

  test('notFound when params is undefined', async () => {
    const result = await getStaticProps({});

    expect(result).toEqual({ notFound: true });
  });

  test('notFound when getProjectByName returns undefined', async () => {
    (getProjectByName as jest.Mock).mockResolvedValue(undefined);

    const result = await getStaticProps({
      params: { project: 'Unknown' },
    });

    expect(result).toEqual({ notFound: true });
  });

  test('notFound when project.regions is empty', async () => {
    (getProjectByName as jest.Mock).mockResolvedValue(
      makeProject({ regions: [] })
    );

    const result = await getStaticProps({
      params: { project: 'TestProject' },
    });

    expect(result).toEqual({ notFound: true });
  });

  test('notFound when getProjectByName throws', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (getProjectByName as jest.Mock).mockRejectedValue(
      new Error('API unreachable')
    );

    const result = await getStaticProps({
      params: { project: 'TestProject' },
    });

    expect(result).toEqual({ notFound: true });
  });
});
