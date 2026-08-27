# BetterBatter

BetterBatter의 통합 저장소입니다. 각 서비스는 디렉터리 단위로 포함되며, 현재 `ui/`는
[`BetterBatter/ui`](https://github.com/BetterBatter/ui)의 Git subtree로 동기화됩니다.

## Repository structure

```text
BetterBatter/
└── ui/  # frontend
```

`ui/`의 직접 개발은 원본 `BetterBatter/ui` 저장소에서 진행합니다. 이 저장소는 자동화로
원본의 `main` 변경을 가져오며, 원본 커밋 이력을 유지합니다.

## Synchronization

- `sync-subtrees.yml`: 5분마다 `ui/main`의 새 커밋을 가져옵니다.
- `mirror-gitlab.yml`: 루트 저장소의 브랜치와 태그를 SSAFY GitLab 저장소로 전송합니다.

