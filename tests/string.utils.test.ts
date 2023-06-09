import { splitUpString } from "../app/utils/string.utils";
import { expect } from 'chai';

describe('splitLongMessage', () => {
    const message = 'A'.repeat(5000) + '\n' + 'B'.repeat(5000);
    const splitMsgs = splitUpString(message, 4089);
  
    it('should split the message into three parts', () => {
        expect(splitMsgs).to.have.lengthOf(3);
    });
  
    it('should have the first two parts of length 4089, and the last part to be less', () => {
        expect(splitMsgs[0]).to.have.lengthOf(4089);
        expect(splitMsgs[1]).to.have.lengthOf(4089);
        expect(splitMsgs[2]?.length).to.be.lessThan(4089);
    });
  
    it('should have the first two parts start with \'A\', and the last part to start with \'B\'', () => {
        expect(splitMsgs[0]?.[0]).to.equal('A');
        expect(splitMsgs[1]?.[0]).to.equal('A');
        expect(splitMsgs[2]?.[0]).to.equal('B');
    });
});
