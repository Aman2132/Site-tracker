export type OwnerTabParamList = {
  Map: undefined;
  /** personId opens that person's sheet (tap-through from Activity). */
  Crew: { personId?: string } | undefined;
  Camera: undefined;
  /** personId narrows the grid to that person (tap-through from Activity). */
  Photos: { personId?: string } | undefined;
  Activity: undefined;
  Profile: undefined;
};

export type WorkerTabParamList = {
  Home: undefined;
  Camera: undefined;
  MyPhotos: undefined;
  Items: undefined;
  SiteMap: undefined;
  Profile: undefined;
};
