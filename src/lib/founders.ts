export const foundersOf = <Member extends { founder: boolean }>(members: Member[]) => members.filter((member) => member.founder);
