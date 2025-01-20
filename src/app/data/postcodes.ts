interface PostcodeData {
  postcode: string,
  numKids: [
    {year: string, kids: number}
  ]
}

export const postcodes: PostcodeData[] = [
  {
    postcode: 'BN2 4',
    numKids: [
      { year: '14', kids: 159 }
    ]
  }
];