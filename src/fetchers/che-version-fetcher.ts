import axios from 'axios';
import { injectable } from 'inversify';

@injectable()
export class CheVersionFetcher {
  public static readonly CHE_POM_XML = 'https://raw.githubusercontent.com/eclipse/che/master/pom.xml';

  private version: Promise<string | undefined>;

  async init(): Promise<string | undefined> {
    // first, get che latest version
    const grabCheVersion = /<\/parent>[^]*<version>(\d+\.\d+\.\d(?:-.*\d)*)(?:-SNAPSHOT)?<\/version>[^]*<packaging>/gm;

    const response = await axios.get(CheVersionFetcher.CHE_POM_XML);
    const data = response.data;

    const parsedVersion = grabCheVersion.exec(data);
    if (parsedVersion) {
      return parsedVersion[1];
    } else {
      return undefined;
    }
  }

  public getVersion(): Promise<string | undefined> {
    if (!this.version) {
      this.version = this.init();
    }

    return this.version;
  }
}
