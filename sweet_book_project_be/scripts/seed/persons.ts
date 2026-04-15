/**
 * 시드 데이터: 8명 데모 계정 상수
 */

export interface PersonDef {
  idx: number; // 0-based
  email: string;
  name: string;
  password: string;
  portraitUrl: string; // randomuser.me portrait
}

export const PERSONS: PersonDef[] = [
  {
    idx: 0,
    email: 'demo01@groupbook.test',
    name: '김지수',
    password: 'demo1234',
    portraitUrl: 'https://randomuser.me/api/portraits/women/11.jpg',
  },
  {
    idx: 1,
    email: 'demo02@groupbook.test',
    name: '이민준',
    password: 'demo1234',
    portraitUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    idx: 2,
    email: 'demo03@groupbook.test',
    name: '박서연',
    password: 'demo1234',
    portraitUrl: 'https://randomuser.me/api/portraits/women/45.jpg',
  },
  {
    idx: 3,
    email: 'demo04@groupbook.test',
    name: '최도윤',
    password: 'demo1234',
    portraitUrl: 'https://randomuser.me/api/portraits/men/55.jpg',
  },
  {
    idx: 4,
    email: 'demo05@groupbook.test',
    name: '정하은',
    password: 'demo1234',
    portraitUrl: 'https://randomuser.me/api/portraits/women/62.jpg',
  },
  {
    idx: 5,
    email: 'demo06@groupbook.test',
    name: '강준호',
    password: 'demo1234',
    portraitUrl: 'https://randomuser.me/api/portraits/men/77.jpg',
  },
  {
    idx: 6,
    email: 'demo07@groupbook.test',
    name: '윤채원',
    password: 'demo1234',
    portraitUrl: 'https://randomuser.me/api/portraits/women/88.jpg',
  },
  {
    idx: 7,
    email: 'demo08@groupbook.test',
    name: '임시우',
    password: 'demo1234',
    portraitUrl: 'https://randomuser.me/api/portraits/men/91.jpg',
  },
];

/** 모임별 멤버 인덱스 (0-based) */
export const GROUP_MEMBERS = {
  /** 모임① "2026 봄 동창회" (COLLECTING): owner=demo01(idx0), 멤버 01,03,04,05,06 */
  group1: [0, 2, 3, 4, 5],
  /** 모임② "등산 동호회 3월 정모" (EDITING): owner=demo02(idx1), 멤버 02,03,04,07 */
  group2: [1, 2, 3, 6],
  /** 모임③ "가족 제주 여행" (ORDERED): owner=demo05(idx4), 멤버 05,06,08 */
  group3: [4, 5, 7],
  /** 모임④ "사진 동호회 1기" (COLLECTING, 빈 모임): owner=demo07(idx6) */
  group4: [6],
};
